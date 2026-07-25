/** @jest-environment node */

import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  createAuthToken,
  verifyAuthToken,
} from '@/lib/auth-token';

describe('signed auth tokens', () => {
  const originalEnv = process.env;
  const now = 1_800_000_000_000;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      ADMIN_PASSWORD: 'correct horse battery staple',
    };
    delete process.env.AUTH_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates a verifiable, expiring token', async () => {
    const token = await createAuthToken(now);
    expect(token).toMatch(/^v1\.\d+\.[A-Za-z0-9_-]+$/);
    expect(await verifyAuthToken(token || undefined, now + 1)).toBe(true);
  });

  it('rejects forged and modified tokens', async () => {
    const token = await createAuthToken(now);
    expect(await verifyAuthToken('authenticated', now)).toBe(false);
    expect(await verifyAuthToken(`${token}x`, now)).toBe(false);
  });

  it('rejects expired tokens', async () => {
    const token = await createAuthToken(now);
    const expiry = now + AUTH_COOKIE_MAX_AGE_SECONDS * 1000;
    expect(await verifyAuthToken(token || undefined, expiry)).toBe(false);
  });

  it('invalidates sessions when the signing secret rotates', async () => {
    process.env.AUTH_SECRET = 'first-secret';
    const token = await createAuthToken(now);
    process.env.AUTH_SECRET = 'second-secret';
    expect(await verifyAuthToken(token || undefined, now + 1)).toBe(false);
  });

  it('cannot issue a production token without a configured secret', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    delete process.env.ADMIN_PASSWORD;
    delete process.env.AUTH_SECRET;
    expect(await createAuthToken(now)).toBeNull();
  });
});

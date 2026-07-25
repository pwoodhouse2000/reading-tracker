export const AUTH_COOKIE_NAME = 'reading-tracker-auth';
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const TOKEN_VERSION = 'v1';
const encoder = new TextEncoder();

function getSigningSecret(): string | null {
  const configuredSecret = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD;
  if (configuredSecret) return configuredSecret;

  // Local development remains password-optional. Production must always have
  // a real secret, so a missing configuration cannot silently grant access.
  return process.env.NODE_ENV === 'production'
    ? null
    : 'reading-tracker-local-development-only';
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const binary = atob(padded);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createAuthToken(now = Date.now()): Promise<string | null> {
  const secret = getSigningSecret();
  if (!secret) return null;

  const expiresAt = now + AUTH_COOKIE_MAX_AGE_SECONDS * 1000;
  const payload = `${TOKEN_VERSION}.${expiresAt}`;
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));

  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAuthToken(
  token: string | undefined,
  now = Date.now()
): Promise<boolean> {
  if (!token || token.length > 512) return false;

  const secret = getSigningSecret();
  if (!secret) return false;

  const [version, expiresAtValue, signatureValue, ...extraParts] = token.split('.');
  if (
    extraParts.length > 0 ||
    version !== TOKEN_VERSION ||
    !/^\d+$/.test(expiresAtValue || '')
  ) {
    return false;
  }

  const expiresAt = Number(expiresAtValue);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;

  const signature = fromBase64Url(signatureValue || '');
  if (!signature) return false;

  const payload = `${version}.${expiresAtValue}`;
  const key = await importSigningKey(secret);

  return crypto.subtle.verify(
    'HMAC',
    key,
    signature as BufferSource,
    encoder.encode(payload)
  );
}

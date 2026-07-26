import '@testing-library/jest-dom';

// jsdom exposes crypto without Web Crypto's subtle API. Authentication tokens
// use the same standards-based API available in Node and the Next.js runtime.
if (!global.crypto || !global.crypto.subtle) {
  const { webcrypto } = require('node:crypto');
  Object.defineProperty(global, 'crypto', {
    configurable: true,
    value: webcrypto,
  });
}

// Polyfill Web Fetch API globals when missing
// (needed by next/server imports in jsdom; Node 18+ has native fetch)
if (typeof global.Request === 'undefined') {
  try {
    const { TextEncoder, TextDecoder } = require('node:util');
    if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
    if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;
    const webStreams = require('node:stream/web');
    if (typeof global.ReadableStream === 'undefined') global.ReadableStream = webStreams.ReadableStream;
    if (typeof global.WritableStream === 'undefined') global.WritableStream = webStreams.WritableStream;
    if (typeof global.TransformStream === 'undefined') global.TransformStream = webStreams.TransformStream;
    const { MessageChannel, MessagePort } = require('node:worker_threads');
    if (typeof global.MessageChannel === 'undefined') global.MessageChannel = MessageChannel;
    if (typeof global.MessagePort === 'undefined') global.MessagePort = MessagePort;
    const undici = require('undici');
    global.Request = undici.Request;
    global.Response = undici.Response;
    global.Headers = undici.Headers;
  } catch {
    // undici unavailable or TextDecoder missing in this environment — skip
  }
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock window.matchMedia (only in jsdom environments where window exists)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
}

// Mock fetch globally
global.fetch = jest.fn();

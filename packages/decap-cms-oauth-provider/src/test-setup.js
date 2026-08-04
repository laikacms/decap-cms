/**
 * This repo's root Jest config runs under `testEnvironment: 'jsdom'`, whose
 * global scope does not include `crypto.subtle`/`Request`/`Response`
 * (unlike every real target runtime for this package: browsers, Cloudflare
 * Workers, Vercel Edge, Netlify Edge, Deno, and plain Node 18+). This file
 * polyfills just enough of the ambient Fetch/WebCrypto globals for tests to
 * run in that environment. Production code always uses the ambient globals
 * directly - this is test infra only.
 */
const { webcrypto } = require('node:crypto');
const { TextDecoder, TextEncoder } = require('node:util');
const { Headers, Request, Response } = require('node-fetch');

if (typeof window.crypto === 'undefined' || !window.crypto.subtle) {
  window.crypto = webcrypto;
}
if (typeof window.Request === 'undefined') {
  window.Request = Request;
  window.Response = Response;
  window.Headers = Headers;
}
if (typeof window.TextEncoder === 'undefined') {
  window.TextEncoder = TextEncoder;
  window.TextDecoder = TextDecoder;
}

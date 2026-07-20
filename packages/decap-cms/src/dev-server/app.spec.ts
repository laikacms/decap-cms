// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from './app';
import { registerMiddleware as registerLocalFs } from './middlewares/localFs';

import type http from 'node:http';
import type { DevServerApp } from './app';

// Console-shaped no-op logger: keeps expected 4xx responses out of the test output.
const noop = () => {};
const logger = { log: noop, info: noop, error: noop, warn: noop, debug: noop };

let server: http.Server;

function listen(app: DevServerApp): Promise<string> {
  return new Promise(resolve => {
    server = app.listen(0, undefined, () => {
      const address = server.address() as { port: number };
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

afterEach(() => {
  server?.close();
});

describe('createApp', () => {
  it('routes POST requests and parses the JSON body', async () => {
    const app = createApp({ logger });
    app.post('/api/v1', (req, res) => {
      res.json({ received: req.body.action });
    });
    const baseUrl = await listen(app);

    const response = await fetch(`${baseUrl}/api/v1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'info' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    await expect(response.json()).resolves.toEqual({ received: 'info' });
  });

  it('runs chained handlers when next is called and stops when it is not', async () => {
    const app = createApp({ logger });
    app.post('/api/v1', (req, res, next) => {
      if (req.body.action === 'blocked') {
        res.status(422).json({ error: 'blocked' });
      } else {
        next();
      }
    });
    app.post('/api/v1', (req, res) => {
      res.json({ ok: true });
    });
    const baseUrl = await listen(app);

    const blocked = await fetch(`${baseUrl}/api/v1`, {
      method: 'POST',
      body: JSON.stringify({ action: 'blocked' }),
    });
    expect(blocked.status).toBe(422);
    await expect(blocked.json()).resolves.toEqual({ error: 'blocked' });

    const passed = await fetch(`${baseUrl}/api/v1`, {
      method: 'POST',
      body: JSON.stringify({ action: 'info' }),
    });
    expect(passed.status).toBe(200);
    await expect(passed.json()).resolves.toEqual({ ok: true });
  });

  it('answers CORS preflight requests', async () => {
    const app = createApp({ logger });
    const baseUrl = await listen(app);

    const response = await fetch(`${baseUrl}/api/v1`, {
      method: 'OPTIONS',
      headers: { 'Access-Control-Request-Headers': 'content-type' },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    expect(response.headers.get('access-control-allow-headers')).toBe('content-type');
  });

  it('responds 404 for unknown routes', async () => {
    const app = createApp({ logger });
    const baseUrl = await listen(app);

    const response = await fetch(`${baseUrl}/nope`, { method: 'POST', body: '{}' });

    expect(response.status).toBe(404);
  });

  it('responds 400 for invalid JSON bodies', async () => {
    const app = createApp({ logger });
    app.post('/api/v1', (req, res) => {
      res.json({ ok: true });
    });
    const baseUrl = await listen(app);

    const response = await fetch(`${baseUrl}/api/v1`, { method: 'POST', body: 'not json' });

    expect(response.status).toBe(400);
  });

  it('serves the localFs middleware', async () => {
    const app = createApp({ logger });
    registerLocalFs(app, { logger });
    const baseUrl = await listen(app);

    const info = await fetch(`${baseUrl}/api/v1`, {
      method: 'POST',
      body: JSON.stringify({ action: 'info' }),
    });
    expect(info.status).toBe(200);
    await expect(info.json()).resolves.toEqual(
      expect.objectContaining({ type: 'local_fs', publish_modes: ['simple'] }),
    );

    const invalid = await fetch(`${baseUrl}/api/v1`, {
      method: 'POST',
      body: JSON.stringify({ action: 'unknown' }),
    });
    expect(invalid.status).toBe(422);
  });
});

import http from 'http';
import express from 'express';
import winston from 'winston';

import { registerCommonMiddlewares } from '.';

import type { AddressInfo } from 'net';

function request(
  options: http.RequestOptions,
  body?: string,
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode ?? 0,
          headers: res.headers,
          body: data,
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

describe('registerCommonMiddlewares', () => {
  let server: http.Server;
  let port: number;
  let debugSpy: jest.SpyInstance;
  let logger: winston.Logger;
  const originalOrigin = process.env.ORIGIN;

  function startServer() {
    const app = express();
    logger = winston.createLogger({
      transports: [new winston.transports.Console({ silent: true })],
    });
    debugSpy = jest.spyOn(logger, 'debug');

    registerCommonMiddlewares(app, { logger });

    app.post('/echo', (req, res) => {
      res.json({ received: req.body });
    });
    app.get('/ping', (_req, res) => {
      res.send('pong');
    });

    server = app.listen(0);
    port = (server.address() as AddressInfo).port;
  }

  afterEach(done => {
    delete process.env.ORIGIN;
    if (originalOrigin !== undefined) {
      process.env.ORIGIN = originalOrigin;
    }
    server?.close(done);
  });

  it('pipes access log lines through the supplied logger.debug', async () => {
    startServer();

    await request({ method: 'GET', host: 'localhost', port, path: '/ping' });

    expect(debugSpy).toHaveBeenCalled();
    const [line] = debugSpy.mock.calls[0];
    expect(line).toEqual(expect.stringContaining('GET /ping'));
  });

  it('registers express.json body parsing so route handlers receive a parsed body', async () => {
    startServer();

    const payload = JSON.stringify({ hello: 'world' });
    const { statusCode, body } = await request(
      {
        method: 'POST',
        host: 'localhost',
        port,
        path: '/echo',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      payload,
    );

    expect(statusCode).toBe(200);
    expect(JSON.parse(body)).toEqual({ received: { hello: 'world' } });
  });

  describe('default CORS origin (ORIGIN env unset)', () => {
    beforeEach(() => {
      delete process.env.ORIGIN;
      startServer();
    });

    it('allows a localhost origin', async () => {
      const { headers } = await request({
        method: 'GET',
        host: 'localhost',
        port,
        path: '/ping',
        headers: { Origin: 'http://localhost:8080' },
      });

      expect(headers['access-control-allow-origin']).toBe('http://localhost:8080');
    });

    it('allows a 127.0.0.1 origin', async () => {
      const { headers } = await request({
        method: 'GET',
        host: 'localhost',
        port,
        path: '/ping',
        headers: { Origin: 'http://127.0.0.1:8080' },
      });

      expect(headers['access-control-allow-origin']).toBe('http://127.0.0.1:8080');
    });

    it('rejects an arbitrary third-party origin', async () => {
      const { headers } = await request({
        method: 'GET',
        host: 'localhost',
        port,
        path: '/ping',
        headers: { Origin: 'https://evil.example.com' },
      });

      expect(headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('when ORIGIN env is set', () => {
    beforeEach(() => {
      process.env.ORIGIN = 'https://allowed.example.com';
      startServer();
    });

    it('always reflects the configured origin, ignoring the default localhost regex', async () => {
      const allowed = await request({
        method: 'GET',
        host: 'localhost',
        port,
        path: '/ping',
        headers: { Origin: 'https://allowed.example.com' },
      });
      expect(allowed.headers['access-control-allow-origin']).toBe('https://allowed.example.com');

      // The `cors` package echoes a fixed string origin regardless of the request's
      // actual Origin header, so the localhost/127.0.0.1 regex fallback no longer applies
      // once ORIGIN is set.
      const localhostAttempt = await request({
        method: 'GET',
        host: 'localhost',
        port,
        path: '/ping',
        headers: { Origin: 'http://localhost:8080' },
      });
      expect(localhostAttempt.headers['access-control-allow-origin']).toBe(
        'https://allowed.example.com',
      );
    });
  });
});

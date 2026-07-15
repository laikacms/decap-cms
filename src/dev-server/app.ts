import http from 'node:http';

import type winston from 'winston';

// Matches the 50mb limit the proxy server historically allowed for base64 asset payloads.
const MAX_BODY_BYTES = 50 * 1024 * 1024;

export type RequestBody = {
  action?: string;
  params?: unknown;
};

export interface DevServerRequest {
  body: RequestBody;
}

export interface DevServerResponse {
  status(code: number): DevServerResponse;
  json(payload: unknown): void;
}

export type NextFunction = () => void;

export type Handler = (
  req: DevServerRequest,
  res: DevServerResponse,
  next: NextFunction,
) => unknown;

export interface DevServerApp {
  post(path: string, handler: Handler): void;
  listen(port: number, host: string | undefined, onListen: () => void): http.Server;
}

type AppOptions = {
  logger: winston.Logger;
};

function sendJson(res: http.ServerResponse, code: number, payload: unknown) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function wrapResponse(res: http.ServerResponse): DevServerResponse {
  return {
    status(code: number) {
      res.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      sendJson(res, res.statusCode, payload);
    },
  };
}

// Sets the CORS headers previously provided by the `cors` middleware and answers
// preflight requests. Returns true when the request was a handled preflight.
function handleCors(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const origin = process.env.ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  if (origin !== '*') {
    res.setHeader('Vary', 'Origin');
  }
  if (req.method !== 'OPTIONS') {
    return false;
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  const requestHeaders = req.headers['access-control-request-headers'];
  if (requestHeaders) {
    res.setHeader('Access-Control-Allow-Headers', requestHeaders);
  }
  res.statusCode = 204;
  res.end();
  return true;
}

function readJsonBody(req: http.IncomingMessage): Promise<RequestBody> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    req.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        req.destroy();
        reject(Object.assign(new Error('request entity too large'), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('error', reject);
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as RequestBody);
      } catch {
        reject(Object.assign(new Error('invalid JSON body'), { statusCode: 400 }));
      }
    });
  });
}

async function runHandlers(handlers: Handler[], req: DevServerRequest, res: DevServerResponse) {
  for (const handler of handlers) {
    let nextCalled = false;
    await handler(req, res, () => {
      nextCalled = true;
    });
    if (!nextCalled) {
      return;
    }
  }
}

export function createApp({ logger }: AppOptions): DevServerApp {
  const routes = new Map<string, Handler[]>();

  const server = http.createServer(async (req, res) => {
    res.on('finish', () => {
      logger.debug(`${req.method} ${req.url} ${res.statusCode}`);
    });

    if (handleCors(req, res)) {
      return;
    }

    const pathname = (req.url || '/').split('?')[0];
    const handlers = routes.get(`${req.method} ${pathname}`);
    if (!handlers) {
      sendJson(res, 404, { error: 'Not Found' });
      return;
    }

    let body: RequestBody;
    try {
      body = await readJsonBody(req);
    } catch (e: unknown) {
      const statusCode = (e as { statusCode?: number }).statusCode || 400;
      sendJson(res, statusCode, { error: e instanceof Error ? e.message : 'invalid request' });
      return;
    }

    try {
      await runHandlers(handlers, { body }, wrapResponse(res));
    } catch (e: unknown) {
      logger.error(e instanceof Error ? e.message : 'Unknown error');
      if (!res.writableEnded) {
        sendJson(res, 500, { error: 'Unknown error' });
      }
    }
  });

  return {
    post(path: string, handler: Handler) {
      const key = `POST ${path}`;
      routes.set(key, [...(routes.get(key) || []), handler]);
    },
    listen(port: number, host: string | undefined, onListen: () => void) {
      return host ? server.listen(port, host, onListen) : server.listen(port, onListen);
    },
  };
}

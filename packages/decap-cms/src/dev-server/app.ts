import http from 'node:http';

import type { AddressInfo } from 'node:net';

// Matches the 50mb limit the proxy server historically allowed for base64 asset payloads.
const MAX_BODY_BYTES = 50 * 1024 * 1024;

export type RequestBody = {
  action?: string,
  params?: unknown,
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
  logger: Pick<Console, 'log' | 'info' | 'error' | 'warn' | 'debug'>,
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

// The CMS origins allowed to call the server when ORIGIN is not set.
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

type AllowedOrigin = string | RegExp;

function isOriginAllowed(allowedOrigin: AllowedOrigin, origin: string) {
  if (typeof allowedOrigin === 'string') {
    return allowedOrigin === '*' || origin === allowedOrigin;
  }
  return allowedOrigin.test(origin);
}

/** Addresses that only accept connections from this machine. */
export function isLoopbackAddress(host: string) {
  const name = host.toLowerCase().replace(/^\[(.*)\]$/, '$1');
  return name === 'localhost' || name.endsWith('.localhost') || name === '::1' || /^127(\.\d{1,3}){3}$/.test(name);
}

/** The hostname of a Host header, without its port: `[::1]:8081` -> `[::1]`. */
function hostnameOf(hostHeader: string) {
  return hostHeader.startsWith('[') ? hostHeader.slice(0, hostHeader.indexOf(']') + 1) : hostHeader.split(':')[0];
}

/**
 * The server has no authentication: whoever can call it can read and write the
 * repository. CORS only stops a page from reading responses, so also refuse
 * requests a browser sends on behalf of another origin, and, while the server
 * is only reachable from this machine, requests addressed to any other host
 * name: that is how a DNS-rebinding page reaches a localhost server. Returns
 * true when the request was refused.
 */
function refuseRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  allowedOrigin: AllowedOrigin,
  checkHost: boolean,
): boolean {
  const { origin, host } = req.headers;
  // Requests without an Origin header don't come from a web page.
  if (origin !== undefined && !isOriginAllowed(allowedOrigin, origin)) {
    sendJson(res, 403, { error: `Origin ${origin} is not allowed; set ORIGIN to the CMS origin` });
    return true;
  }
  if (checkHost && !isLoopbackAddress(hostnameOf(host || ''))) {
    sendJson(res, 403, { error: `Host ${host} is not allowed` });
    return true;
  }
  return false;
}

// Sets the CORS headers previously provided by the `cors` middleware and answers
// preflight requests. Returns true when the request was a handled preflight.
function handleCors(req: http.IncomingMessage, res: http.ServerResponse, allowedOrigin: AllowedOrigin): boolean {
  if (allowedOrigin === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // Like the `cors` middleware: a fixed origin is always sent, a pattern
    // reflects the request's origin only when it matches.
    const { origin } = req.headers;
    if (typeof allowedOrigin === 'string') {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    } else if (origin && allowedOrigin.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
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
  const allowedOrigin: AllowedOrigin = process.env.ORIGIN || LOCALHOST_ORIGIN;
  const bindHost = process.env.BIND_HOST;
  const checkHost = !bindHost || isLoopbackAddress(bindHost);

  const requestListener: http.RequestListener = async (req, res) => {
    res.on('finish', () => {
      logger.debug(`${req.method} ${req.url} ${res.statusCode}`);
    });

    const pathname = (req.url || '/').split('?')[0];
    const isApi = pathname === '/api/v1' || pathname.startsWith('/api/v1/');
    if (isApi && refuseRequest(req, res, allowedOrigin, checkHost)) {
      return;
    }

    if (handleCors(req, res, allowedOrigin)) {
      return;
    }

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
  };

  return {
    post(path: string, handler: Handler) {
      const key = `POST ${path}`;
      routes.set(key, [...(routes.get(key) || []), handler]);
    },
    listen(port: number, host: string | undefined, onListen: () => void) {
      const server = http.createServer(requestListener);
      return host ? server.listen(port, host, onListen) : server.listen(port, onListen);
    },
  };
}

function listenOn(app: DevServerApp, port: number, host: string): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => resolve(server));
    server.once('error', reject);
  });
}

/**
 * Start listening. The server can write any file in the repository and has no
 * authentication, so without a `host` it only listens on this machine: the CMS
 * calls http://localhost:8081, and localhost resolves to either loopback
 * address, so it listens on both 127.0.0.1 and ::1.
 */
export async function startServer(
  app: DevServerApp,
  { port, host, logger }: { port: number, host?: string | undefined, logger: AppOptions['logger'] },
): Promise<http.Server> {
  if (host) {
    const server = await listenOn(app, port, host);
    logger.info(`Decap CMS Proxy Server listening on ${host}:${port}`);
    if (!isLoopbackAddress(host)) {
      logger.warn(
        `The proxy has no authentication: anyone who can reach ${host}:${port} can read and write files in your repository`,
      );
    }
    return server;
  }

  const server = await listenOn(app, port, '127.0.0.1');
  try {
    // The bound port, not `port`, which may be 0 for "any free port".
    const ipv6Server = await listenOn(app, (server.address() as AddressInfo).port, '::1');
    server.on('close', () => ipv6Server.close());
  } catch (e: unknown) {
    // IPv6 disabled on this machine: browsers fall back to 127.0.0.1.
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== 'EADDRNOTAVAIL' && code !== 'EAFNOSUPPORT') {
      server.close();
      throw e;
    }
  }
  logger.info(`Decap CMS Proxy Server listening on port ${port} (this machine only; set BIND_HOST to expose it)`);
  return server;
}

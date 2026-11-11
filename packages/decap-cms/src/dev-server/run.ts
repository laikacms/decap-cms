import { createApp, startServer } from './app';
import { registerMiddleware as registerLocalFs } from './middlewares/localFs';
import { registerMiddleware as registerLocalGit } from './middlewares/localGit';

import type http from 'node:http';

export type DevServerLogger = Pick<Console, 'log' | 'info' | 'error' | 'warn' | 'debug'>;

/**
 * Options for `runDevServer`. Each one falls back to the environment variable
 * the server has always read, then to its default, so the env-var entry
 * (`index.ts`) and a caller with explicit options (the `decap dev` CLI) run
 * the same server.
 */
export type DevServerOptions = {
  /** PORT, default 8081. 0 picks a free port. */
  port?: number | undefined,
  /** BIND_HOST: listen on this address only. Default: this machine only (127.0.0.1 and ::1). */
  host?: string | undefined,
  /** MODE: `fs` (default) writes files directly, `git` commits and supports the editorial workflow. */
  mode?: string | undefined,
  /** GIT_REPO_DIRECTORY, default the current directory. */
  dir?: string | undefined,
  /** ORIGIN: the CMS origin allowed to call the server, default localhost. */
  origin?: string | undefined,
  /**
   * LOG_LEVEL: `error`, `warn`, `info`, `http`, `verbose`, `debug` or `silly`
   * (the levels decap-server took). Unset logs everything, as this entry
   * always has.
   */
  logLevel?: string | undefined,
  /** Where log lines go. Default: the console, filtered by `logLevel`. */
  logger?: DevServerLogger | undefined,
};

const LEVELS = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];

/** A console logger that drops lines below `level`. */
export function createLogger(level: string, target: DevServerLogger = console): DevServerLogger {
  const max = LEVELS.indexOf(level);
  if (max < 0) {
    throw new Error(`Unknown log level '${level}'. Use one of: ${LEVELS.join(', ')}.`);
  }
  const noop = () => {};
  const at = (name: string, write: (...args: unknown[]) => void) => (LEVELS.indexOf(name) <= max ? write : noop);
  return {
    error: at('error', target.error.bind(target)),
    warn: at('warn', target.warn.bind(target)),
    info: at('info', target.info.bind(target)),
    log: at('info', target.log.bind(target)),
    debug: at('debug', target.debug.bind(target)),
  };
}

/**
 * Start the local proxy server for the CMS's `proxy` backend. Throws (rather
 * than exiting the process) when the mode is unknown, the repository is not
 * usable or the port is taken, so a caller can report it its own way.
 */
export async function runDevServer(options: DevServerOptions = {}): Promise<http.Server> {
  const env = process.env;
  const port = options.port ?? parseInt(env.PORT || '8081', 10);
  const host = options.host || env.BIND_HOST || undefined;
  const mode = options.mode || env.MODE || 'fs';
  const repoPath = options.dir || env.GIT_REPO_DIRECTORY || undefined;
  const origin = options.origin || env.ORIGIN || undefined;
  const logLevel = options.logLevel || env.LOG_LEVEL || undefined;
  const logger = options.logger ?? (logLevel ? createLogger(logLevel) : console);

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port '${options.port ?? env.PORT}'`);
  }

  const app = createApp({ logger, origin, bindHost: host });
  const middlewareOptions = { logger, repoPath };
  if (mode === 'fs') {
    registerLocalFs(app, middlewareOptions);
  } else if (mode === 'git') {
    await registerLocalGit(app, middlewareOptions);
  } else {
    throw new Error(`Unknown proxy mode '${mode}'`);
  }

  try {
    return await startServer(app, { port, host, logger });
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      // One line instead of a stack trace; `code` stays for callers that add their own hint.
      throw Object.assign(new Error(`Port ${port} is already in use`), { code: 'EADDRINUSE' });
    }
    throw e;
  }
}

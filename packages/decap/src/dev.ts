/**
 * `decap dev`: v4's own local proxy server (`decap-cms/dev-server`), the
 * replacement for `npx decap-server`. The server is not copied here: it is
 * the one decap-cms maintains, bundled into this package's dist at build
 * time (see scripts/build.mjs).
 */
import type http from 'node:http';

/** `decap dev` flags. Each one overrides the environment variable named in the help. */
export interface DevFlags {
  /** --port, PORT. */
  port?: string | undefined;
  /** --host, BIND_HOST. */
  host?: string | undefined;
  /** --mode, MODE. */
  mode?: string | undefined;
  /** --dir, GIT_REPO_DIRECTORY. */
  dir?: string | undefined;
  /** --origin, ORIGIN. */
  origin?: string | undefined;
  /** --log-level, LOG_LEVEL. */
  logLevel?: string | undefined;
}

/**
 * The dev-server entry starts a server from the environment as soon as it is
 * imported; this flag (read by that entry) tells it the CLI starts it instead.
 */
const EMBEDDED_FLAG = Symbol.for('decap-cms.dev-server.embedded');

export async function runDev(flags: DevFlags): Promise<http.Server> {
  if (flags.port !== undefined && !/^\d+$/.test(flags.port)) throw new Error('--port must be a number.');

  (globalThis as Record<symbol, unknown>)[EMBEDDED_FLAG] = true;
  // Loaded only for this command: the dev server brings simple-git and reads
  // `.env` (dotenv) as it loads, which login, whoami and mcp have no use for.
  const { runDevServer } = await import('decap-cms/dev-server');

  try {
    return await runDevServer({
      port: flags.port === undefined ? undefined : Number(flags.port),
      host: flags.host,
      mode: flags.mode,
      dir: flags.dir,
      origin: flags.origin,
      // Like decap-server: `info` unless LOG_LEVEL or --log-level says otherwise.
      logLevel: flags.logLevel || process.env.LOG_LEVEL || 'info',
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      throw new Error(`${(err as Error).message}; pass --port <other>`, { cause: err });
    }
    throw err;
  }
}

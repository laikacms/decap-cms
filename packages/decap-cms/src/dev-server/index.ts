import 'dotenv/config';

import { runDevServer } from './run';

export { createLogger, runDevServer } from './run';
export type { DevServerLogger, DevServerOptions } from './run';

/**
 * Importing this module starts the server from the environment (PORT,
 * BIND_HOST, MODE, GIT_REPO_DIRECTORY, ORIGIN, LOG_LEVEL, also read from
 * `.env`), and exits the process if it cannot. A caller that wants to start
 * it itself, with options and its own error handling, sets this flag on
 * `globalThis` before importing and calls `runDevServer`: the `decap dev`
 * CLI does.
 */
export const EMBEDDED_FLAG = Symbol.for('decap-cms.dev-server.embedded');

if (!(globalThis as Record<symbol, unknown>)[EMBEDDED_FLAG]) {
  runDevServer().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : 'Unknown error');
    process.exit(1);
  });
}

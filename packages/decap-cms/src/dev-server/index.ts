import 'dotenv/config';

import { createApp, startServer } from './app';
import { registerMiddleware as registerLocalFs } from './middlewares/localFs';
import { registerMiddleware as registerLocalGit } from './middlewares/localGit';

const port = parseInt(process.env.PORT || '8081', 10);
const host = process.env.BIND_HOST;

(async () => {
  const logger = console;
  const app = createApp({ logger });
  const options = {
    logger,
  };

  try {
    const mode = process.env.MODE || 'fs';
    if (mode === 'fs') {
      registerLocalFs(app, options);
    } else if (mode === 'git') {
      await registerLocalGit(app, options);
    } else {
      throw new Error(`Unknown proxy mode '${mode}'`);
    }
  } catch (e: unknown) {
    logger.error(e instanceof Error ? e.message : 'Unknown error');
    process.exit(1);
  }

  try {
    return await startServer(app, { port, host, logger });
  } catch (e: unknown) {
    logger.error(e instanceof Error ? e.message : 'Unknown error');
    process.exit(1);
  }
})();

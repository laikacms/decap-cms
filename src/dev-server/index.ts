import 'dotenv/config';

import { createApp } from './app';
import { registerMiddleware as registerLocalGit } from './middlewares/localGit';
import { registerMiddleware as registerLocalFs } from './middlewares/localFs';
import { createLogger } from './logger';

const port = parseInt(process.env.PORT || '8081', 10);
const host = process.env.BIND_HOST;
const level = process.env.LOG_LEVEL || 'info';

(async () => {
  const logger = createLogger({ level });
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

  if (host) {
    return app.listen(port, host, () => {
      logger.info(`Decap CMS Proxy Server listening on ${host}:${port}`);
    });
  } else {
    return app.listen(port, undefined, () => {
      logger.info(`Decap CMS Proxy Server listening on port ${port}`);
    });
  }
})();

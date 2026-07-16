import { defineConfig } from 'cypress';

import viteConfig from './vite.config.cypress.ts';

export default defineConfig({
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
      viteConfig,
    },
  },
  projectId: '1c35bs',
  retries: {
    runMode: 2,
    openMode: 0,
  },
  e2e: {
    video: false,
    async setupNodeEvents(on, config) {
      const { default: setupPlugins } = await import('./cypress/plugins/index.ts');
      return setupPlugins(on, config);
    },
    baseUrl: 'http://localhost:8080',
    specPattern: 'cypress/e2e/*spec*.ts',
  },
});

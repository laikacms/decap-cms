import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: '1c35bs',
  retries: {
    runMode: 2,
    openMode: 0,
  },
  e2e: {
    video: false,
    setupNodeEvents(on, config) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('./cypress/plugins/index.ts')(on, config);
    },
    baseUrl: 'http://localhost:8080',
    specPattern: 'cypress/e2e/*spec*.ts',
  },
});

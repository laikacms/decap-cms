// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)
 
import 'dotenv/config';
import path from 'node:path';
import { merge } from 'lodash-es';
import { addMatchImageSnapshotPlugin } from '@simonsmith/cypress-image-snapshot/plugin';

import {
  setupGitHub,
  teardownGitHub,
  setupGitHubTest,
  teardownGitHubTest,
  seedGitHubRepo,
} from './github';
import {
  setupGitGateway,
  teardownGitGateway,
  setupGitGatewayTest,
  teardownGitGatewayTest,
} from './gitGateway';
import { setupGitLab, teardownGitLab, setupGitLabTest, teardownGitLabTest } from './gitlab';
import {
  setupBitBucket,
  teardownBitBucket,
  setupBitBucketTest,
  teardownBitBucketTest,
} from './bitbucket';
import { setupProxy, teardownProxy, setupProxyTest, teardownProxyTest } from './proxy';
import { setupTestBackend } from './testBackend';
import { copyBackendFiles, switchVersion, updateConfig } from '../utils/config';

export default async (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions): Promise<void> => {
  // `on` is used to hook into various events Cypress emits
  on('task', {
    async setupBackend({ backend, options }: { backend: string; options: any }) {
      console.log('Preparing environment for backend', backend);
      await copyBackendFiles(backend);

      let result = null;
      switch (backend) {
        case 'github':
          result = await setupGitHub(options);
          break;
        case 'git-gateway':
          result = await setupGitGateway(options);
          break;
        case 'gitlab':
          result = await setupGitLab(options);
          break;
        case 'bitbucket':
          result = await setupBitBucket(options);
          break;
        case 'proxy':
          result = await setupProxy(options);
          break;
        case 'test':
          result = await setupTestBackend(options);
          break;
      }

      return result;
    },
    async teardownBackend(taskData: any) {
      const { backend } = taskData;
      console.log('Tearing down backend', backend);

      switch (backend) {
        case 'github':
          await teardownGitHub(taskData);
          break;
        case 'git-gateway':
          await teardownGitGateway(taskData);
          break;
        case 'gitlab':
          await teardownGitLab(taskData);
          break;
        case 'bitbucket':
          await teardownBitBucket(taskData);
          break;
        case 'proxy':
          await teardownProxy(taskData);
          break;
      }

      console.log('Restoring defaults');
      await copyBackendFiles('test');

      return null;
    },
    async setupBackendTest(taskData: any) {
      const { backend, testName } = taskData;
      console.log(`Setting up single test '${testName}' for backend`, backend);

      switch (backend) {
        case 'github':
          await setupGitHubTest(taskData);
          break;
        case 'git-gateway':
          await setupGitGatewayTest(taskData);
          break;
        case 'gitlab':
          await setupGitLabTest(taskData);
          break;
        case 'bitbucket':
          await setupBitBucketTest(taskData);
          break;
        case 'proxy':
          await setupProxyTest(taskData);
          break;
      }

      return null;
    },
    async teardownBackendTest(taskData: any) {
      const { backend, testName } = taskData;

      console.log(`Tearing down single test '${testName}' for backend`, backend);

      switch (backend) {
        case 'github':
          await teardownGitHubTest(taskData);
          break;
        case 'git-gateway':
          await teardownGitGatewayTest(taskData);
          break;
        case 'gitlab':
          await teardownGitLabTest(taskData);
          break;
        case 'bitbucket':
          await teardownBitBucketTest(taskData);
          break;
        case 'proxy':
          await teardownProxyTest(taskData);
          break;
      }

      return null;
    },
    async seedRepo(taskData: any) {
      const { backend } = taskData;

      console.log(`Seeding repository for backend`, backend);

      switch (backend) {
        case 'github':
          await seedGitHubRepo(taskData);
          break;
      }

      return null;
    },
    async switchToVersion(taskData: { version: string }) {
      const { version } = taskData;

      console.log(`Switching CMS to version '${version}'`);

      await switchVersion(version);

      return null;
    },
    async updateConfig(configUpdate: Record<string, unknown>) {
      await updateConfig(current => {
        merge(current, configUpdate);
      });

      return null;
    },
    async useRichTextWidget() {
      console.log('Updating config to use richtext widget');
      await updateConfig((current: any) => {
        if (current.collections) {
          current.collections = current.collections.map((collection: any) => {
            if (collection.fields) {
              collection.fields = collection.fields.map((field: any) => {
                if (field.widget === 'markdown') {
                  return { ...field, widget: 'richtext' };
                }
                return field;
              });
            }
            return collection;
          });
        }
      });
      return null;
    },
  });

  addMatchImageSnapshotPlugin(on);
};

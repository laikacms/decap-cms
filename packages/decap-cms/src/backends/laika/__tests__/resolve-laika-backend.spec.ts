import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCAL_BACKEND_BASE_PATH,
  DEFAULT_LOCAL_BACKEND_DEV_TOKEN,
  type LaikaBackendModuleConfig,
  resolveLaikaBackend,
} from '@/backends/laika/resolve-laika-backend.js';

const remote: LaikaBackendModuleConfig = {
  name: 'laika',
  base_url: 'https://api.example.com',
  app_id: 'remote-app-id',
};

describe('resolveLaikaBackend()', () => {
  it('dev flag truthy: returns a local backend targeting the default Slice 1 base path with a dummy token', () => {
    const backend = resolveLaikaBackend({ remote, dev: true });

    expect(backend).toMatchObject({
      name: 'laika',
      base_url: DEFAULT_LOCAL_BACKEND_BASE_PATH,
      dev_token: DEFAULT_LOCAL_BACKEND_DEV_TOKEN,
    });
    // Never the remote config's identity when local mode is selected.
    expect(backend).not.toMatchObject({ app_id: remote.app_id });
  });

  it('dev flag truthy + local overrides: honours a custom basePath and devToken', () => {
    const backend = resolveLaikaBackend({
      local: { basePath: '/api/local', devToken: 'my-dummy-token' },
      remote,
      dev: true,
    });

    expect(backend).toMatchObject({
      name: 'laika',
      base_url: '/api/local',
      dev_token: 'my-dummy-token',
    });
  });

  it('dev flag falsy: returns the remote backend unchanged (fail-safe, never the local one)', () => {
    const backend = resolveLaikaBackend({ remote, dev: false });

    expect(backend).toBe(remote);
  });

  it('real import.meta.env.DEV default is only consulted when `dev` is omitted entirely', () => {
    // Sanity check for the default-parameter wiring itself: omitting `dev`
    // reads the live `import.meta.env.DEV` rather than defaulting to `false`
    // outright. Vitest's own Vite pipeline sets `DEV: true`, so local mode
    // engages here. This is the behaviour real `vite dev` relies on; a
    // production build (`DEV: false`) falls through to `remote` the same way
    // the explicit-`false` cases above do.
    const backend = resolveLaikaBackend({ remote });

    expect(backend).toMatchObject({ name: 'laika', base_url: DEFAULT_LOCAL_BACKEND_BASE_PATH });
  });
});

describe('README documents resolveLaikaBackend()', () => {
  // Pinning test (DCMS-1980): resolveLaikaBackend() and its public exports were
  // added without any README coverage. Fails if the docs regress again.
  // `node:path` is off-limits under src/backends/ (DCMS-1223: backends must
  // stay browser-bundle-safe), and `import.meta.url` isn't a `file:` URL
  // under vitest's jsdom environment — so resolve off `process.cwd()`
  // (vitest always runs from the package root) with plain string concat.
  const readme = readFileSync(`${process.cwd()}/src/backends/laika/README.md`, 'utf-8');

  it.each([
    'resolveLaikaBackend',
    'LocalLaikaBackendOptions',
    'ResolveLaikaBackendOptions',
    'DEFAULT_LOCAL_BACKEND_BASE_PATH',
    'DEFAULT_LOCAL_BACKEND_DEV_TOKEN',
  ])('mentions %s', name => {
    expect(readme).toContain(name);
  });

  it('documents the local defaults', () => {
    expect(readme).toContain(DEFAULT_LOCAL_BACKEND_BASE_PATH);
    expect(readme).toContain(DEFAULT_LOCAL_BACKEND_DEV_TOKEN);
  });
});

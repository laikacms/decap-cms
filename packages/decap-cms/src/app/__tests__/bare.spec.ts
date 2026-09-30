import { beforeEach, describe, expect, it, vi } from 'vitest';

// Cold-loading the app graph is slow real work under a parallel full-suite run.
const COLD_APP_IMPORT_TIMEOUT_MS = 30_000;

describe('@laikacms/decap-cms/app/bare', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exports the classic app without eagerly registering extensions or locales', async () => {
    const bareApp = await import('@/app/bare');
    const classicComponents = await import('@/app/components');
    const { getLocale, resolveBackend } = await import('@/core/lib/registry');

    expect(bareApp.DecapCmsApp.init).toBe(bareApp.init);
    expect(bareApp.App).toBe(classicComponents.App);
    expect(getLocale('en')).toBeUndefined();
    expect(() => resolveBackend('github')).toThrow();
  }, COLD_APP_IMPORT_TIMEOUT_MS);
});

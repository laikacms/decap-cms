import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('decap-cms/app/bare', () => {
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
  });
});

import { beforeEach, describe, expect, it } from 'vitest';

import { resolveConfigFilePath } from '@/core/lib/configEditorPath';

describe('resolveConfigFilePath', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://example.com/admin/index.html'),
      writable: true,
    });
  });

  it('resolves a bare filename relative to the current page', () => {
    expect(resolveConfigFilePath('config.yml')).toBe('admin/config.yml');
  });

  it('resolves an absolute path unaffected by the current page', () => {
    expect(resolveConfigFilePath('/config.yml')).toBe('config.yml');
  });

  it('resolves a fully-qualified URL by its pathname', () => {
    expect(resolveConfigFilePath('https://example.com/admin/config.yml')).toBe('admin/config.yml');
  });

  it('falls back to config.yml for an empty/root path', () => {
    expect(resolveConfigFilePath('/')).toBe('config.yml');
  });
});

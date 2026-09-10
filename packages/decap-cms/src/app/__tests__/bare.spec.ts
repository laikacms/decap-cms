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

  it('forwards registerEditorComponent to the richtext widget registry (v3 window.CMS parity)', async () => {
    const bareApp = await import('@/app/bare');
    const { getEditorComponent } = await import('@/widgets/richtext/editorComponents');

    bareApp.DecapCmsApp.registerEditorComponent({
      id: 'youtube',
      label: 'YouTube',
      fields: [{ name: 'id', label: 'Video ID', widget: 'string' }],
      pattern: /^{{< youtube (\S+) >}}/,
      fromBlock: match => ({ id: match[1] }),
      toBlock: data => `{{< youtube ${data.id} >}}`,
    });

    expect(getEditorComponent('youtube')?.label).toBe('YouTube');

    bareApp.DecapCmsApp.unregisterEditorComponent('youtube');

    expect(getEditorComponent('youtube')).toBeUndefined();
  });
});

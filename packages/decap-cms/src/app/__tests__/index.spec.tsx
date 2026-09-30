import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createRoot, rootRender } = vi.hoisted(() => {
  const rootRender = vi.fn();
  return {
    rootRender,
    createRoot: vi.fn(() => ({ render: rootRender, unmount: vi.fn() })),
  };
});

vi.mock('react-dom/client', () => ({ createRoot }));

// Cold-loading the whole eager app graph takes ~2s alone and >5s when the full
// suite runs in parallel; the import itself is the slow real work.
const COLD_APP_IMPORT_TIMEOUT_MS = 30_000;

describe('app entry auto-init followed by explicit init (DCMS-2396)', () => {
  beforeEach(() => {
    vi.resetModules();
    createRoot.mockClear();
    rootRender.mockClear();
    document.body.innerHTML = '';
  });

  it('mounts once when the entry auto-boots and the consumer then calls CMS.init()', async () => {
    const { DecapCmsApp } = await import('@/app/index');

    expect(createRoot).toHaveBeenCalledTimes(1);

    DecapCmsApp.registerBackend('late-backend', { init: vi.fn() } as never);
    DecapCmsApp.init();

    expect(createRoot).toHaveBeenCalledTimes(1);
    expect(rootRender).toHaveBeenCalledTimes(2);
  }, COLD_APP_IMPORT_TIMEOUT_MS);
});

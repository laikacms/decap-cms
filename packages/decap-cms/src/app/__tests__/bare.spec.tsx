import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createRoot, rootRender } = vi.hoisted(() => {
  const rootRender = vi.fn();
  return {
    rootRender,
    createRoot: vi.fn(() => ({ render: rootRender, unmount: vi.fn() })),
  };
});

vi.mock('react-dom/client', () => ({ createRoot }));

import { init } from '@/app/bare';

describe('app/bare init', () => {
  beforeEach(() => {
    createRoot.mockClear();
    rootRender.mockClear();
    document.body.innerHTML = '';
  });

  it('creates one React root per container when init() is called twice', () => {
    init();
    init();

    // Two `createRoot` calls on the same container leave two independent roots
    // reconciling overlapping DOM, which surfaces as the `NotFoundError:
    // removeChild` crash in DCMS-1896.
    expect(createRoot).toHaveBeenCalledTimes(1);
    expect(rootRender).toHaveBeenCalledTimes(2);
  });

  it('mounts into the existing #nc-root element when one is already present', () => {
    const container = document.createElement('div');
    container.id = 'nc-root';
    document.body.appendChild(container);

    init();

    expect(createRoot).toHaveBeenCalledWith(container);
    expect(document.querySelectorAll('#nc-root')).toHaveLength(1);
  });

  it('creates a fresh root for a container it has not mounted into before', () => {
    init();
    // Simulates a full teardown: the old container is gone, so the WeakMap
    // entry is unreachable and the new container needs its own root.
    document.body.innerHTML = '';
    init();

    expect(createRoot).toHaveBeenCalledTimes(2);
  });
});

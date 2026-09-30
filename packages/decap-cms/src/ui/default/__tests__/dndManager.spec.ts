import { HTML5Backend } from 'react-dnd-html5-backend';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createDragDropManager = vi.fn(() => ({ id: Symbol('manager') }));

vi.mock('dnd-core', () => ({ createDragDropManager }));

/**
 * `getDndManager` is the app-wide react-dnd manager shared by `Sortable`
 * and `DragDrop`. It must be lazy (SSR-safe: importing never touches the
 * DOM) and a single shared instance (React StrictMode fix).
 */
describe('ui-default dndManager (DCMS-2437)', () => {
  beforeEach(() => {
    vi.resetModules();
    createDragDropManager.mockClear();
  });

  it('does not create a manager on import', async () => {
    await import('@/ui/default/dndManager');

    expect(createDragDropManager).not.toHaveBeenCalled();
  });

  it('creates the manager with HTML5Backend on first call', async () => {
    const { getDndManager } = await import('@/ui/default/dndManager');

    getDndManager();

    expect(createDragDropManager).toHaveBeenCalledTimes(1);
    expect(createDragDropManager).toHaveBeenCalledWith(HTML5Backend);
  });

  it('returns the identical instance on repeated calls', async () => {
    const { getDndManager } = await import('@/ui/default/dndManager');

    const first = getDndManager();
    const second = getDndManager();

    expect(second).toBe(first);
    expect(createDragDropManager).toHaveBeenCalledTimes(1);
  });
});

import { createDragDropManager } from 'dnd-core';
import { HTML5Backend } from 'react-dnd-html5-backend';

import type { DragDropManager } from 'dnd-core';

let manager: DragDropManager | undefined;

/**
 * Single app-wide drag-and-drop manager, passed to every `DndProvider` via
 * the `manager` prop.
 *
 * react-dnd's default global-singleton path (`DndProvider` with only a
 * `backend`) is broken under React StrictMode: the double-invoked ref-count
 * effect nulls the window-level singleton while the first provider still
 * holds its manager, so each later provider creates a fresh manager and the
 * second HTML5 backend to set up throws "Cannot have two HTML5 backends at
 * the same time". An explicit shared manager skips that code path entirely.
 *
 * Lazy so importing this module never touches the DOM (SSR-safe); the first
 * provider render only ever happens in a browser.
 */
export function getDndManager(): DragDropManager {
  if (!manager) {
    manager = createDragDropManager(HTML5Backend);
  }
  return manager;
}

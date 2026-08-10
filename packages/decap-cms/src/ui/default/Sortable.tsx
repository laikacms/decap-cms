import React from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';

import { getDndManager } from './dndManager';

import type { ConnectDragSource } from 'react-dnd';

export interface SortEndArgs {
  oldIndex: number;
  newIndex: number;
}

interface SortableAreaContextValue {
  namespace: string;
  itemCount: number;
  onSortEnd: (args: SortEndArgs) => void;
}

const SortableAreaContext = React.createContext<SortableAreaContextValue | null>(null);

export interface SortableAreaProps {
  onSortEnd: (args: SortEndArgs) => void;
  children: React.ReactNode;
}

/**
 * Enables drag-and-drop reordering for the `SortableItem`s rendered inside it.
 * Each area gets its own drag type, so sibling or nested areas never accept
 * each other's items. All areas share the one app-wide manager from
 * `getDndManager`, so mounting many areas at once is safe.
 */
export function SortableArea({ onSortEnd, children }: SortableAreaProps) {
  const namespace = React.useId();
  const itemCount = React.Children.count(children);
  const onSortEndRef = React.useRef(onSortEnd);
  onSortEndRef.current = onSortEnd;
  const value = React.useMemo(
    () => ({
      namespace,
      itemCount,
      onSortEnd: (args: SortEndArgs) => onSortEndRef.current(args),
    }),
    [namespace, itemCount],
  );

  return (
    <DndProvider manager={getDndManager()}>
      <SortableAreaContext.Provider value={value}>{children}</SortableAreaContext.Provider>
    </DndProvider>
  );
}

interface SortableHandleContextValue {
  connect: ConnectDragSource;
  index: number;
  itemCount: number;
  onSortEnd: (args: SortEndArgs) => void;
}

const SortableHandleContext = React.createContext<SortableHandleContextValue | null>(null);

export interface SortableItemState {
  isDragging: boolean;
  isOver: boolean;
}

export interface SortableItemProps {
  index: number;
  /**
   * When true, the item is only draggable from a `SortableHandle` rendered
   * among its children; the element that receives `ref` becomes the drag
   * preview and drop target. When false, that element is itself draggable.
   */
  withHandle?: boolean;
  children: (
    ref: (node: HTMLElement | null) => void,
    state: SortableItemState,
  ) => React.ReactElement;
}

interface DragItem {
  index: number;
}

export function SortableItem({ index, withHandle = false, children }: SortableItemProps) {
  const area = React.useContext(SortableAreaContext);
  if (!area) {
    throw new Error('SortableItem must be rendered inside a SortableArea');
  }
  const { namespace, itemCount, onSortEnd } = area;

  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: namespace,
      item: { index },
      collect: monitor => ({ isDragging: monitor.isDragging() }),
    }),
    [namespace, index],
  );

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: namespace,
      drop: (item: DragItem) => {
        if (item.index !== index) {
          onSortEnd({ oldIndex: item.index, newIndex: index });
        }
      },
      collect: monitor => ({
        isOver: monitor.isOver() && (monitor.getItem() as DragItem)?.index !== index,
      }),
    }),
    [namespace, index, onSortEnd],
  );

  const ref = React.useCallback(
    (node: HTMLElement | null) => {
      drop(node);
      if (withHandle) {
        preview(node);
      } else {
        drag(node);
      }
    },
    [drag, drop, preview, withHandle],
  );

  const handleContextValue = React.useMemo<SortableHandleContextValue | null>(
    () => (withHandle ? { connect: drag, index, itemCount, onSortEnd } : null),
    [withHandle, drag, index, itemCount, onSortEnd],
  );

  return (
    <SortableHandleContext.Provider value={handleContextValue}>
      {children(ref, { isDragging, isOver })}
    </SortableHandleContext.Provider>
  );
}

export interface SortableHandleProps {
  id?: string | undefined;
  children: React.ReactNode;
}

const visuallyHiddenStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * Drag handle for a `SortableItem` rendered with `withHandle`. Outside that
 * context it renders an inert wrapper.
 *
 * Besides pointer drag-and-drop, the handle is a focusable element
 * (`role="button"`, `tabIndex=0`) that supports the WAI-ARIA APG Sortable
 * pattern's `ArrowUp` / `ArrowDown` keys, so reordering is possible without a
 * pointing device. A visually-hidden live region announces the new position
 * after a keyboard-driven move.
 */
export function SortableHandle({ children }: SortableHandleProps) {
  const handle = React.useContext(SortableHandleContext);
  const [announcement, setAnnouncement] = React.useState('');

  if (!handle) {
    return <div>{children}</div>;
  }

  const { connect, index, itemCount, onSortEnd } = handle;

  function move(direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= itemCount) {
      return;
    }
    onSortEnd({ oldIndex: index, newIndex });
    setAnnouncement(`Moved item to position ${newIndex + 1} of ${itemCount}.`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    }
  }

  return (
    <div
      ref={node => {
        connect(node);
      }}
      role="button"
      tabIndex={0}
      aria-label={`Reorder item, position ${index + 1} of ${itemCount}. Press arrow up or arrow down to move.`}
      onKeyDown={handleKeyDown}
    >
      {children}
      <span role="status" aria-live="polite" style={visuallyHiddenStyle}>
        {announcement}
      </span>
    </div>
  );
}

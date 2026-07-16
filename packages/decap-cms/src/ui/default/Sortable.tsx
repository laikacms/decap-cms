import React from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import type { ConnectDragSource } from 'react-dnd';

export interface SortEndArgs {
  oldIndex: number;
  newIndex: number;
}

interface SortableAreaContextValue {
  namespace: string;
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
 * each other's items. react-dnd's provider shares one HTML5 backend per
 * window, so mounting many areas at once is safe.
 */
export function SortableArea({ onSortEnd, children }: SortableAreaProps) {
  const namespace = React.useId();
  const onSortEndRef = React.useRef(onSortEnd);
  onSortEndRef.current = onSortEnd;
  const value = React.useMemo(
    () => ({
      namespace,
      onSortEnd: (args: SortEndArgs) => onSortEndRef.current(args),
    }),
    [namespace],
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <SortableAreaContext.Provider value={value}>{children}</SortableAreaContext.Provider>
    </DndProvider>
  );
}

const SortableHandleContext = React.createContext<ConnectDragSource | null>(null);

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
  const { namespace, onSortEnd } = area;

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

  return (
    <SortableHandleContext.Provider value={withHandle ? drag : null}>
      {children(ref, { isDragging, isOver })}
    </SortableHandleContext.Provider>
  );
}

export interface SortableHandleProps {
  id?: string;
  children: React.ReactNode;
}

/**
 * Drag handle for a `SortableItem` rendered with `withHandle`. Outside that
 * context it renders an inert wrapper.
 */
export function SortableHandle({ children }: SortableHandleProps) {
  const connect = React.useContext(SortableHandleContext);
  return (
    <div
      ref={node => {
        connect?.(node);
      }}
    >
      {children}
    </div>
  );
}

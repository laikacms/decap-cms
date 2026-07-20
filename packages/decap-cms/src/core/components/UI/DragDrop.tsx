import React from 'react';
import { DndProvider as ReactDNDProvider, useDrag, useDrop } from 'react-dnd';

import { getDndManager } from '@/ui/default/dndManager';

import type { ConnectDragSource, ConnectDropTarget } from 'react-dnd';

export interface DragSourceProps {
  namespace: string;
  children: (connectDragComponent: ConnectDragSource) => React.ReactNode;
  [key: string]: unknown;
}

export function DragSource({ namespace, children, ...ownProps }: DragSourceProps) {
  const [, connectDragSource] = useDrag({
    type: namespace,
    item: () => ownProps,
  });

  return <>{children(connectDragSource)}</>;
}

export interface DropTargetProps {
  onDrop: (item: Record<string, unknown>) => void;
  namespace: string;
  children: (
    connectDropTarget: ConnectDropTarget,
    state: { isHovered: boolean },
  ) => React.ReactNode;
}

export function DropTarget({ onDrop, namespace, children }: DropTargetProps) {
  const [{ isHovered }, connectDropTarget] = useDrop({
    accept: namespace,
    drop: (item: Record<string, unknown>) => {
      onDrop(item);
    },
    collect: monitor => ({
      isHovered: monitor.isOver(),
    }),
  });

  return <>{children(connectDropTarget, { isHovered })}</>;
}

export function HTML5DragDrop<P extends object>(WrappedComponent: React.ComponentType<P>) {
  // TS defers LibraryManagedAttributes while P is generic, so JSX rejects the
  // spread; erase the generic once here instead.
  const Component = WrappedComponent as React.ComponentType<object>;
  function HTML5DragDropWrapper(props: P) {
    return (
      <ReactDNDProvider manager={getDndManager()}>
        <Component {...props} />
      </ReactDNDProvider>
    );
  }
  HTML5DragDropWrapper.displayName = `HTML5DragDrop(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;
  return HTML5DragDropWrapper;
}

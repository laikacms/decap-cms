import { HTML5Backend as ReactDNDHTML5Backend } from 'react-dnd-html5-backend';
import {
  DndProvider as ReactDNDProvider,
  useDrag,
  useDrop,
} from 'react-dnd';
import type { ConnectDragSource, ConnectDropTarget } from 'react-dnd';
import React from 'react';

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
  children: (connectDropTarget: ConnectDropTarget, state: { isHovered: boolean }) => React.ReactNode;
}

export function DropTarget({ onDrop, namespace, children }: DropTargetProps) {
  const [{ isHovered }, connectDropTarget] = useDrop({
    accept: namespace,
    drop: (item: Record<string, unknown>) => {
      onDrop(item);
    },
    collect: (monitor) => ({
      isHovered: monitor.isOver(),
    }),
  });

  return <>{children(connectDropTarget, { isHovered })}</>;
}

export function HTML5DragDrop<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return class HTML5DragDrop extends React.Component<P> {
    render() {
      return (
        <ReactDNDProvider backend={ReactDNDHTML5Backend}>
          <WrappedComponent {...this.props} />
        </ReactDNDProvider>
      );
    }
  };
}

import { createElement } from 'react';

import type { ComponentType } from 'react';

/**
 * Wrap a component so it always receives a fixed set of props, overridable by
 * the caller. Used to reuse one element component across several node types.
 *
 * No `forwardRef`: under React 19 `ref` arrives as an ordinary prop and is
 * forwarded with the rest. `createElement` rather than JSX because JSX cannot
 * resolve `LibraryManagedAttributes` for a component whose props are generic.
 */
export default function withProps<P extends object, D extends Partial<P>>(
  Component: ComponentType<P>,
  defaultProps: D,
) {
  return function ExtendComponent(props: P) {
    return createElement(Component, { ...defaultProps, ...props });
  };
}

/**
 * Vendored port of `react-scroll-sync` (npm `react-scroll-sync@1.0.2`,
 * https://github.com/okonet/react-scroll-sync).
 *
 * Source: `react-scroll-sync@1.0.2`'s `src/components/ScrollSync.tsx`,
 * `src/components/ScrollSyncPane.tsx`, and `src/hooks/useScrollSyncContext.ts`.
 * Vendored per DCMS-682 (part of the Base UI migration tracker, #626/DCMS-540):
 * upstream is flagged unmaintained (last publish over a year ago, community
 * notes it as no longer maintained) and the package is tiny — two exports
 * used across two call sites in this repo — so it's copied in rather than
 * pulled in as a dependency (see `src/ui/README.md`, vendoring option 2).
 *
 * Adaptations from upstream:
 *  - The three upstream source files (`ScrollSync.tsx`, `ScrollSyncPane.tsx`,
 *    `useScrollSyncContext.ts`) are inlined into this single file, per the
 *    one-primitive-per-file convention in `src/ui/README.md`.
 *  - No styling of any kind is applied here (this is a headless behavior
 *    primitive, same as `src/ui/cmdk.tsx`).
 *  - Behavior, prop names, and defaults are otherwise unchanged from
 *    upstream — this is a drop-in replacement, not a rewrite.
 *
 * MIT License
 *
 * Copyright (c) 2016 Andrey Okonetchnikov
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { Children, cloneElement, createContext, useCallback, useContext, useEffect, useRef } from 'react';

import type { FC, PropsWithChildren, ReactElement, RefCallback, RefObject } from 'react';

interface ScrollSyncContextValue {
  registerPane: (node: HTMLElement, groups: string[]) => void;
  unregisterPane: (node: HTMLElement, groups: string[]) => void;
}

const ScrollSyncContext = createContext<ScrollSyncContextValue | undefined>(undefined);

const useScrollSyncContext = (): ScrollSyncContextValue => {
  const context = useContext(ScrollSyncContext);
  if (!context) {
    throw new Error('useScrollSyncContext must be used within a ScrollSync');
  }
  return context;
};

export interface ScrollSyncProps {
  /**
   * Whether scroll synchronization is enabled.
   * @default true
   */
  enabled?: boolean;

  /**
   * Enable horizontal scroll synchronization.
   * @default true
   */
  horizontal?: boolean;

  /**
   * Callback fired after panes are synchronized.
   * Receives the scrolled HTMLElement as an argument.
   */
  onSync?: (el: HTMLElement) => void;

  /**
   * Whether to synchronize scroll positions proportionally.
   * If false, uses absolute scroll values.
   * @default true
   */
  proportional?: boolean;

  /**
   * Enable vertical scroll synchronization.
   * @default true
   */
  vertical?: boolean;
}

export const ScrollSync: FC<PropsWithChildren<ScrollSyncProps>> = ({
  children,
  enabled = true,
  horizontal = true,
  onSync,
  proportional = true,
  vertical = true,
}) => {
  const panesRef = useRef<Record<string, HTMLElement[]>>({});

  const findPane = useCallback((node: HTMLElement, group: string) => {
    if (!panesRef.current[group]) {
      return false;
    }
    return panesRef.current[group].find(pane => pane === node);
  }, []);

  const syncScrollPosition = useCallback(
    (scrolledPane: HTMLElement, pane: HTMLElement) => {
      const {
        clientHeight,
        clientWidth,
        scrollHeight,
        scrollLeft,
        scrollTop,
        scrollWidth,
      } = scrolledPane;

      const scrollTopOffset = scrollHeight - clientHeight;
      const scrollLeftOffset = scrollWidth - clientWidth;

      /* Calculate the actual pane height */
      const paneHeight = pane.scrollHeight - clientHeight;
      const paneWidth = pane.scrollWidth - clientWidth;
      /* Adjust the scrollTop position of it accordingly */
      if (vertical && scrollTopOffset > 0) {
        pane.scrollTop = proportional
          ? (paneHeight * scrollTop) / scrollTopOffset
          : scrollTop;
      }
      if (horizontal && scrollLeftOffset > 0) {
        pane.scrollLeft = proportional
          ? (paneWidth * scrollLeft) / scrollLeftOffset
          : scrollLeft;
      }
    },
    [proportional, vertical, horizontal],
  );

  const removeEvents = useCallback((node: HTMLElement) => {
    node.onscroll = null;
  }, []);

  const addEvents = useCallback(
    (node: HTMLElement, groups: string[]) => {
      node.onscroll = () => {
        if (!enabled) return;
        window.requestAnimationFrame(() => {
          groups.forEach(group => {
            panesRef.current[group]?.forEach(pane => {
              /* For all panes beside the currently scrolling one */
              if (node !== pane) {
                removeEvents(pane);
                syncScrollPosition(node, pane);
                /* Re-attach event listeners after we're done scrolling */
                window.requestAnimationFrame(() => {
                  const paneGroups = Object.keys(panesRef.current).filter(
                    paneGroup => panesRef.current[paneGroup].includes(pane),
                  );
                  addEvents(pane, paneGroups);
                });
              }
            });
          });
        });

        if (onSync) {
          onSync(node);
        }
      };
    },
    [onSync, removeEvents, syncScrollPosition, enabled],
  );

  const registerPane = useCallback(
    (node: HTMLElement, groups: string[]) => {
      groups.forEach(group => {
        if (!panesRef.current[group]) {
          panesRef.current[group] = [];
        }

        if (!findPane(node, group)) {
          if (panesRef.current[group].length > 0) {
            syncScrollPosition(panesRef.current[group][0], node);
          }
          panesRef.current[group].push(node);
        }
      });
      addEvents(node, groups);
    },
    [findPane, syncScrollPosition, addEvents],
  );

  const unregisterPane = useCallback(
    (node: HTMLElement, groups: string[]) => {
      groups.forEach(group => {
        if (findPane(node, group)) {
          removeEvents(node);
          const index = panesRef.current[group].indexOf(node);
          if (index !== -1) {
            panesRef.current[group].splice(index, 1);
          }
        }
      });
    },
    [findPane, removeEvents],
  );

  return (
    <ScrollSyncContext.Provider value={{ registerPane, unregisterPane }}>
      {Children.only(children)}
    </ScrollSyncContext.Provider>
  );
};

export interface ScrollSyncPaneProps {
  /**
   * Optionally attach scroll sync to an external HTMLElement, ref, or ref
   * callback. If provided, the pane will sync scroll with this element
   * instead of the child.
   */
  attachTo?: HTMLElement | null | RefCallback<HTMLElement> | RefObject<HTMLElement>;

  /**
   * The scrollable child element to be synchronized.
   */
  children: ReactElement<any>;

  /**
   * Whether scroll synchronization is enabled for this pane.
   * @default true
   */
  enabled?: boolean;

  /**
   * Group or groups this pane belongs to for scroll synchronization.
   * Panes in the same group will sync scroll positions.
   * @default 'default'
   */
  group?: string | string[];

  /**
   * Ref or callback to access the underlying HTMLElement of the pane.
   */
  innerRef?: RefCallback<HTMLElement> | RefObject<HTMLElement>;
}

const castArray = (groups: string | string[]): string[] => Array.isArray(groups) ? groups : [groups];

export const ScrollSyncPane: FC<ScrollSyncPaneProps> = ({
  attachTo,
  children,
  enabled = true,
  group = 'default',
  innerRef,
}) => {
  const context = useScrollSyncContext();
  const childRef = useRef<HTMLElement | null>(null);
  const nodeRef = useRef<HTMLElement | null>(null);

  const updateNode = useCallback(() => {
    if (attachTo) {
      if (attachTo instanceof Element) {
        nodeRef.current = attachTo as HTMLElement;
      } else if (typeof attachTo === 'function') {
        nodeRef.current = null;
      } else {
        nodeRef.current = attachTo.current;
      }
    } else {
      nodeRef.current = childRef.current;
    }
  }, [attachTo]);

  useEffect(() => {
    updateNode();

    if (enabled && nodeRef.current) {
      context.registerPane(nodeRef.current, castArray(group));
    }
    return () => {
      if (enabled && nodeRef.current) {
        context.unregisterPane(nodeRef.current, castArray(group));
      }
    };
  }, [context, enabled, group, attachTo, updateNode]);

  if (attachTo) {
    return children;
  }

  return cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      childRef.current = node;
      if (typeof innerRef === 'function') {
        innerRef(node);
      } else if (innerRef && node) {
        innerRef.current = node;
      }
    },
  });
};

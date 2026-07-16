/**
 * Vendored port of `cmdk-base`, itself a fork of `cmdk`
 * (https://github.com/pacocoursey/cmdk) that swaps Radix UI for Base UI.
 *
 * Source: https://github.com/borabaloglu/cmdk-base/blob/main/packages/core/src/index.tsx
 * Upstream commit: main @ 2026-07 (borabaloglu/cmdk-base, MIT license, see
 * below). Vendored per DCMS-548/DCMS-549 to drop the `cmdk` npm dependency
 * — this is a small, single-file, headless primitive with no ongoing
 * upstream maintenance burden, so it's copied in rather than pulled in as
 * a dependency (see `src/ui/README.md`, vendoring option 2).
 *
 * Adaptations from upstream:
 *  - `useId` comes from `react` (this repo already relies on React 18+
 *    `React.useId`, see `src/ui/Dialog.tsx`) instead of
 *    the `@base-ui/utils/useId` package, avoiding a new dependency.
 *  - The upstream `Command.Dialog` part (a Base UI `Dialog` wrapping
 *    `Command`) is omitted: this repo's command palette
 *    (`src/ui/Command.tsx`) already composes `Command`
 *    with its own `Dialog` primitive (itself built on Base UI `Dialog`,
 *    see `src/ui/Dialog.tsx`), so the upstream
 *    `Dialog` part would be dead code here.
 *  - The `command-score` fuzzy-matching helper (a sibling file upstream)
 *    is inlined below to keep this a single vendored file, per DCMS-549.
 *  - No styling of any kind is applied here (this is the headless
 *    behavior layer); visual styling is layered on top in
 *    `src/ui/Command.tsx` via Emotion, per the styling
 *    contract in `src/ui/README.md`.
 *
 * MIT License
 *
 * Copyright (c) 2026 Bora (cmdk-base)
 * Copyright (c) pacocoursey (cmdk, upstream fork source)
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
import * as React from 'react';

type Children = { children?: React.ReactNode };
type DivProps = React.ComponentPropsWithoutRef<'div'>;

type EmptyProps = Children & DivProps;
type SeparatorProps = DivProps & {
  /** Whether this separator should always be rendered. Useful if you disable automatic filtering. */
  alwaysRender?: boolean,
};
type ListProps =
  & Children
  & DivProps
  & {
    /** Accessible label for this List of suggestions. Not shown visibly. */
    label?: string,
  };
type ItemProps =
  & Children
  & Omit<DivProps, 'disabled' | 'onSelect' | 'value'>
  & {
    /** Whether this item is currently disabled. */
    disabled?: boolean,
    /** Event handler for when this item is selected, either via click or keyboard selection. */
    onSelect?: (value: string) => void,
    /**
     * A unique value for this item.
     * If no value is provided, it will be inferred from `children` or the rendered `textContent`. If your `textContent` changes between renders, you _must_ provide a stable, unique `value`.
     */
    value?: string,
    /** Optional keywords to match against when filtering. */
    keywords?: string[],
    /** Whether this item is forcibly rendered regardless of filtering. */
    forceMount?: boolean,
  };
type GroupProps =
  & Children
  & Omit<DivProps, 'heading' | 'value'>
  & {
    /** Optional heading to render for this group. */
    heading?: React.ReactNode,
    /** If no heading is provided, you must provide a value that is unique for this group. */
    value?: string,
    /** Whether this group is forcibly rendered regardless of filtering. */
    forceMount?: boolean,
  };
type InputProps = Omit<React.ComponentPropsWithoutRef<'input'>, 'value' | 'onChange' | 'type'> & {
  /** Optional controlled state for the value of the search input. */
  value?: string,
  /** Event handler called when the search value changes. */
  onValueChange?: (search: string) => void,
};
type CommandFilter = (value: string, search: string, keywords?: string[]) => number;
type CommandProps =
  & Children
  & DivProps
  & {
    /** Accessible label for this command menu. Not shown visibly. */
    label?: string,
    /**
     * Optionally set to `false` to turn off the automatic filtering and sorting.
     * If `false`, you must conditionally render valid items based on the search query yourself.
     */
    shouldFilter?: boolean,
    /**
     * Custom filter function for whether each command menu item should matches the given search query.
     * It should return a number between 0 and 1, with 1 being the best match and 0 being hidden entirely.
     * By default, uses the inlined `commandScore` matcher below.
     */
    filter?: CommandFilter,
    /** Optional default item value when it is initially rendered. */
    defaultValue?: string,
    /** Optional controlled state of the selected command menu item. */
    value?: string,
    /** Event handler called when the selected item of the menu changes. */
    onValueChange?: (value: string) => void,
    /** Optionally set to `true` to turn on looping around when using the arrow keys. */
    loop?: boolean,
    /** Optionally set to `true` to disable selection via pointer events. */
    disablePointerSelection?: boolean,
    /** Set to `false` to disable ctrl+n/j/p/k shortcuts. Defaults to `true`. */
    vimBindings?: boolean,
  };

type Context = {
  value: (id: string, value: string, keywords?: string[]) => void,
  item: (id: string, groupId: string) => () => void,
  group: (id: string) => () => void,
  filter: () => boolean,
  label: string,
  getDisablePointerSelection: () => boolean,
  listId: string,
  labelId: string,
  inputId: string,
  listInnerRef: React.RefObject<HTMLDivElement | null>,
};
type State = {
  search: string,
  value: string,
  selectedItemId?: string,
  filtered: { count: number, items: Map<string, number>, groups: Set<string> },
};
type Store = {
  subscribe: (callback: () => void) => () => void,
  snapshot: () => State,
  setState: <K extends keyof State>(key: K, value: State[K], opts?: boolean) => void,
  emit: () => void,
};
type Group = {
  id: string,
  forceMount?: boolean,
};

const GROUP_SELECTOR = `[cmdk-group=""]`;
const GROUP_ITEMS_SELECTOR = `[cmdk-group-items=""]`;
const GROUP_HEADING_SELECTOR = `[cmdk-group-heading=""]`;
const ITEM_SELECTOR = `[cmdk-item=""]`;
const VALID_ITEM_SELECTOR = `${ITEM_SELECTOR}:not([aria-disabled="true"])`;
const SELECT_EVENT = `cmdk-item-select`;
const VALUE_ATTR = `data-value`;
const defaultFilter: CommandFilter = (value, search, keywords = []) => commandScore(value, search, keywords);

const CommandContext = React.createContext<Context>(undefined as unknown as Context);
const useCommand = () => React.useContext(CommandContext);
const StoreContext = React.createContext<Store>(undefined as unknown as Store);
const useStore = () => React.useContext(StoreContext);
const GroupContext = React.createContext<Group>(undefined as unknown as Group);

const Command = React.forwardRef<HTMLDivElement, CommandProps>((props, forwardedRef) => {
  const state = useLazyRef<State>(() => ({
    /** Value of the search query. */
    search: '',
    /** Currently selected item value. */
    value: props.value ?? props.defaultValue ?? '',
    /** Currently selected item id. */
    selectedItemId: undefined,
    filtered: {
      /** The count of all visible items. */
      count: 0,
      /** Map from visible item id to its search score. */
      items: new Map(),
      /** Set of groups with at least one visible item. */
      groups: new Set(),
    },
  }));
  const allItems = useLazyRef<Set<string>>(() => new Set()); // [...itemIds]
  const allGroups = useLazyRef<Map<string, Set<string>>>(() => new Map()); // groupId -> [...itemIds]
  const ids = useLazyRef<Map<string, { value: string, keywords?: string[] }>>(() => new Map()); // id -> { value, keywords }
  const listeners = useLazyRef<Set<() => void>>(() => new Set()); // [...rerenders]
  const propsRef = useAsRef(props);
  const {
    label,
    children,
    value,
    onValueChange,
    filter,
    shouldFilter,
    loop,
    disablePointerSelection = false,
    vimBindings = true,
    ...etc
  } = props;

  const listId = React.useId();
  const labelId = React.useId();
  const inputId = React.useId();

  const listInnerRef = React.useRef<HTMLDivElement>(null);

  const schedule = useScheduleLayoutEffect();

  /** Controlled mode `value` handling. */
  useLayoutEffect(() => {
    if (value !== undefined) {
      const v = value.trim();
      state.current.value = v;
      store.emit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useLayoutEffect(() => {
    schedule(6, scrollSelectedIntoView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const store: Store = React.useMemo(() => {
    return {
      subscribe: cb => {
        listeners.current.add(cb);
        return () => listeners.current.delete(cb);
      },
      snapshot: () => {
        return state.current;
      },
      setState: (key, value, opts) => {
        if (Object.is(state.current[key], value)) return;
        state.current[key] = value;

        if (key === 'search') {
          // Filter synchronously before emitting back to children
          filterItems();
          sort();
          schedule(1, selectFirstItem);
        } else if (key === 'value') {
          // Force focus input or root so accessibility works
          const activeElement = document.activeElement;
          if (
            activeElement
            && (activeElement.hasAttribute('cmdk-input') || activeElement.hasAttribute('cmdk-root'))
          ) {
            const input = inputId ? document.getElementById(inputId) : null;
            if (input) input.focus();
            else if (listId) document.getElementById(listId)?.focus();
          }

          schedule(7, () => {
            state.current.selectedItemId = getSelectedItem()?.id;
            store.emit();
          });

          // opts is a boolean referring to whether it should NOT be scrolled into view
          if (!opts) {
            // Scroll the selected item into view
            schedule(5, scrollSelectedIntoView);
          }
          if (propsRef.current?.value !== undefined) {
            // If controlled, just call the callback instead of updating state internally
            const newValue = (value ?? '') as string;
            propsRef.current.onValueChange?.(newValue);
            return;
          }
        }

        // Notify subscribers that state has changed
        store.emit();
      },
      emit: () => {
        listeners.current.forEach(l => l());
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const context: Context = React.useMemo(
    () => ({
      // Keep id -> {value, keywords} mapping up-to-date
      value: (id, value, keywords) => {
        if (value !== ids.current.get(id)?.value) {
          ids.current.set(id, { value, keywords });
          state.current.filtered.items.set(id, score(value, keywords));
          schedule(2, () => {
            sort();
            store.emit();
          });
        }
      },
      // Track item lifecycle (mount, unmount)
      item: (id, groupId) => {
        allItems.current.add(id);

        // Track this item within the group
        if (groupId) {
          if (!allGroups.current.has(groupId)) {
            allGroups.current.set(groupId, new Set([id]));
          } else {
            const group = allGroups.current.get(groupId);
            if (group) {
              group.add(id);
            }
          }
        }

        // Batch this, multiple items can mount in one pass
        // and we should not be filtering/sorting/emitting each time
        schedule(3, () => {
          filterItems();
          sort();

          // Could be initial mount, select the first item if none already selected
          if (!state.current.value) {
            selectFirstItem();
          }

          store.emit();
        });

        return () => {
          ids.current.delete(id);
          allItems.current.delete(id);
          state.current.filtered.items.delete(id);
          const selectedItem = getSelectedItem();

          // Batch this, multiple items could be removed in one pass
          schedule(4, () => {
            filterItems();

            // The item removed have been the selected one,
            // so selection should be moved to the first
            if (selectedItem?.getAttribute('id') === id) selectFirstItem();

            store.emit();
          });
        };
      },
      // Track group lifecycle (mount, unmount)
      group: id => {
        if (!allGroups.current.has(id)) {
          allGroups.current.set(id, new Set());
        }

        return () => {
          ids.current.delete(id);
          allGroups.current.delete(id);
        };
      },
      filter: () => {
        return propsRef.current.shouldFilter ?? true;
      },
      label: label || props['aria-label'] || '',
      getDisablePointerSelection: () => {
        return propsRef.current.disablePointerSelection ?? false;
      },
      listId,
      inputId,
      labelId,
      listInnerRef,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function score(value: string, keywords?: string[]) {
    const filter = propsRef.current?.filter ?? defaultFilter;
    return value ? filter(value, state.current.search, keywords) : 0;
  }

  /** Sorts items by score, and groups by highest item score. */
  function sort() {
    if (
      !state.current.search
      // Explicitly false, because true | undefined is the default
      || propsRef.current.shouldFilter === false
    ) {
      return;
    }

    const scores = state.current.filtered.items;

    // Sort the groups
    const groups: [string, number][] = [];
    state.current.filtered.groups.forEach(value => {
      const items = allGroups.current.get(value);

      // Get the maximum score of the group's items
      let max = 0;
      if (items) {
        items.forEach(item => {
          const score = scores.get(item) ?? 0;
          max = Math.max(score, max);
        });
      }

      groups.push([value, max]);
    });

    // Sort items within groups to bottom
    // Sort items outside of groups
    // Sort groups to bottom (pushes all non-grouped items to the top)
    const listInsertionElement = listInnerRef.current;

    // Sort the items
    getValidItems()
      .sort((a, b) => {
        const valueA = a.getAttribute('id') ?? '';
        const valueB = b.getAttribute('id') ?? '';
        return (scores.get(valueB) ?? 0) - (scores.get(valueA) ?? 0);
      })
      .forEach(item => {
        const group = item.closest(GROUP_ITEMS_SELECTOR);

        if (group) {
          const target = item.parentElement === group ? item : item.closest(`${GROUP_ITEMS_SELECTOR} > *`);
          if (target) {
            group.appendChild(target);
          }
        } else if (listInsertionElement) {
          const target = item.parentElement === listInsertionElement
            ? item
            : item.closest(`${GROUP_ITEMS_SELECTOR} > *`);
          if (target) {
            listInsertionElement.appendChild(target);
          }
        }
      });

    groups
      .sort((a, b) => b[1] - a[1])
      .forEach(group => {
        const element = listInnerRef.current?.querySelector(
          `${GROUP_SELECTOR}[${VALUE_ATTR}="${encodeURIComponent(group[0])}"]`,
        );
        if (element && element.parentElement) {
          element.parentElement.appendChild(element);
        }
      });
  }

  function selectFirstItem() {
    const item = getValidItems().find(item => item.getAttribute('aria-disabled') !== 'true');
    const value = item?.getAttribute(VALUE_ATTR);
    store.setState('value', value ?? '');
  }

  /** Filters the current items. */
  function filterItems() {
    if (
      !state.current.search
      // Explicitly false, because true | undefined is the default
      || propsRef.current.shouldFilter === false
    ) {
      state.current.filtered.count = allItems.current.size;
      // Do nothing, each item will know to show itself because search is empty
      return;
    }

    // Reset the groups
    state.current.filtered.groups = new Set();
    let itemCount = 0;

    // Check which items should be included
    for (const id of allItems.current) {
      const value = ids.current.get(id)?.value ?? '';
      const keywords = ids.current.get(id)?.keywords ?? [];
      const rank = score(value, keywords);
      state.current.filtered.items.set(id, rank);
      if (rank > 0) itemCount++;
    }

    // Check which groups have at least 1 item shown
    for (const [groupId, group] of allGroups.current) {
      for (const itemId of group) {
        if ((state.current.filtered.items.get(itemId) ?? 0) > 0) {
          state.current.filtered.groups.add(groupId);
          break;
        }
      }
    }

    state.current.filtered.count = itemCount;
  }

  function scrollSelectedIntoView() {
    // Wait for popover positioning to complete before scrolling
    requestAnimationFrame(() => {
      const item = getSelectedItem();

      if (item) {
        if (item.parentElement?.firstChild === item) {
          // First item in Group, ensure heading is in view
          item
            .closest(GROUP_SELECTOR)
            ?.querySelector(GROUP_HEADING_SELECTOR)
            ?.scrollIntoView({ block: 'nearest' });
        }

        // Ensure the item is always in view
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  /** Getters */

  function getSelectedItem() {
    return listInnerRef.current?.querySelector(`${ITEM_SELECTOR}[aria-selected="true"]`);
  }

  function getValidItems() {
    return Array.from(listInnerRef.current?.querySelectorAll(VALID_ITEM_SELECTOR) ?? []);
  }

  /** Setters */

  function updateSelectedToIndex(index: number) {
    const items = getValidItems();
    const item = items[index];
    if (item) store.setState('value', item.getAttribute(VALUE_ATTR) ?? '');
  }

  function updateSelectedByItem(change: 1 | -1) {
    const selected = getSelectedItem();
    const items = getValidItems();
    const index = items.findIndex(item => item === selected);

    // Get item at this index
    let newSelected = items[index + change];

    if (propsRef.current?.loop) {
      newSelected = index + change < 0
        ? items[items.length - 1]
        : index + change === items.length
        ? items[0]
        : items[index + change];
    }

    if (newSelected) store.setState('value', newSelected.getAttribute(VALUE_ATTR) ?? '');
  }

  function updateSelectedByGroup(change: 1 | -1) {
    const selected = getSelectedItem();
    let group = selected?.closest(GROUP_SELECTOR);
    let item: HTMLElement | null | undefined;

    while (group && !item) {
      group = change > 0
        ? findNextSibling(group, GROUP_SELECTOR)
        : findPreviousSibling(group, GROUP_SELECTOR);
      item = group?.querySelector(VALID_ITEM_SELECTOR) ?? undefined;
    }

    if (item) {
      store.setState('value', item.getAttribute(VALUE_ATTR) ?? '');
    } else {
      updateSelectedByItem(change);
    }
  }

  const last = () => updateSelectedToIndex(getValidItems().length - 1);

  const next = (e: React.KeyboardEvent) => {
    e.preventDefault();

    if (e.metaKey) {
      // Last item
      last();
    } else if (e.altKey) {
      // Next group
      updateSelectedByGroup(1);
    } else {
      // Next item
      updateSelectedByItem(1);
    }
  };

  const prev = (e: React.KeyboardEvent) => {
    e.preventDefault();

    if (e.metaKey) {
      // First item
      updateSelectedToIndex(0);
    } else if (e.altKey) {
      // Previous group
      updateSelectedByGroup(-1);
    } else {
      // Previous item
      updateSelectedByItem(-1);
    }
  };

  return (
    <div
      ref={forwardedRef}
      tabIndex={-1}
      {...etc}
      cmdk-root=""
      onKeyDown={e => {
        etc.onKeyDown?.(e);

        // Check if IME composition is finished before triggering key binds.
        // This prevents unwanted triggering while user is still inputting text with IME.
        // e.keyCode === 229 is for the CJK IME with Legacy Browser.
        // isComposing is for the CJK IME with Modern Browser.
        const isComposing = e.nativeEvent.isComposing || e.keyCode === 229;

        if (e.defaultPrevented || isComposing) {
          return;
        }

        switch (e.key) {
          case 'n':
          case 'j': {
            // vim keybind down
            if (vimBindings && e.ctrlKey) {
              next(e);
            }
            break;
          }
          case 'ArrowDown': {
            next(e);
            break;
          }
          case 'p':
          case 'k': {
            // vim keybind up
            if (vimBindings && e.ctrlKey) {
              prev(e);
            }
            break;
          }
          case 'ArrowUp': {
            prev(e);
            break;
          }
          case 'Home': {
            // First item
            e.preventDefault();
            updateSelectedToIndex(0);
            break;
          }
          case 'End': {
            // Last item
            e.preventDefault();
            last();
            break;
          }
          case 'Enter': {
            // Trigger item onSelect
            e.preventDefault();
            const item = getSelectedItem();
            if (item) {
              const event = new Event(SELECT_EVENT);
              item.dispatchEvent(event);
            }
          }
        }
      }}
    >
      <label
        cmdk-label=""
        htmlFor={context.inputId}
        id={context.labelId}
        // Screen reader only
        style={srOnlyStyles}
      >
        {label}
      </label>
      <StoreContext.Provider value={store}>
        <CommandContext.Provider value={context}>{children}</CommandContext.Provider>
      </StoreContext.Provider>
    </div>
  );
});
Command.displayName = 'Command';

/**
 * Command menu item. Becomes active on pointer enter or through keyboard navigation.
 * Preferably pass a `value`, otherwise the value will be inferred from `children` or
 * the rendered item's `textContent`.
 */
const Item = React.forwardRef<HTMLDivElement, ItemProps>((props, forwardedRef) => {
  const id = React.useId();
  const ref = React.useRef<HTMLDivElement>(null);
  const groupContext = React.useContext(GroupContext);
  const context = useCommand();
  const propsRef = useAsRef(props);
  const forceMount = propsRef.current?.forceMount ?? groupContext?.forceMount;

  useLayoutEffect(() => {
    if (!forceMount) {
      return context.item(id, groupContext?.id ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceMount]);

  const value = useValue(id, ref, [props.value, props.children, ref], props.keywords);

  const store = useStore();
  const selected = useCmdk(state => state.value && state.value === value.current);
  const render = useCmdk(state =>
    forceMount
      ? true
      : context.filter() === false
      ? true
      : !state.search
      ? true
      : (state.filtered.items.get(id) ?? 0) > 0
  );

  React.useEffect(() => {
    const element = ref.current;
    if (!element || props.disabled) return;
    element.addEventListener(SELECT_EVENT, onSelect);
    return () => element.removeEventListener(SELECT_EVENT, onSelect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render, props.onSelect, props.disabled]);

  function onSelect() {
    select();
    propsRef.current.onSelect?.(value.current ?? '');
  }

  function select() {
    store.setState('value', value.current ?? '', true);
  }

  if (!render) return null;

  const {
    disabled,
    value: _value,
    onSelect: _onSelect,
    forceMount: _forceMount,
    keywords: _keywords,
    ...etc
  } = props;

  return (
    <div
      ref={mergeRefs([ref, forwardedRef])}
      {...etc}
      id={id}
      cmdk-item=""
      role="option"
      aria-disabled={Boolean(disabled)}
      aria-selected={Boolean(selected)}
      data-disabled={Boolean(disabled)}
      data-selected={Boolean(selected)}
      onPointerMove={disabled || context.getDisablePointerSelection() ? undefined : select}
      onClick={disabled ? undefined : onSelect}
    >
      {props.children}
    </div>
  );
});
Item.displayName = 'CommandItem';

/**
 * Group command menu items together with a heading.
 * Grouped items are always shown together.
 */
const Group = React.forwardRef<HTMLDivElement, GroupProps>((props, forwardedRef) => {
  const { heading, children, forceMount, ...etc } = props;
  const id = React.useId();
  const ref = React.useRef<HTMLDivElement>(null);
  const headingRef = React.useRef<HTMLDivElement>(null);
  const headingId = React.useId();
  const context = useCommand();
  const render = useCmdk(state =>
    forceMount
      ? true
      : context.filter() === false
      ? true
      : !state.search
      ? true
      : state.filtered.groups.has(id)
  );

  useLayoutEffect(() => {
    return context.group(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useValue(id, ref, [props.value, props.heading, headingRef]);

  const contextValue = React.useMemo(() => ({ id, forceMount }), [id, forceMount]);

  return (
    <div
      ref={mergeRefs([ref, forwardedRef])}
      {...etc}
      cmdk-group=""
      role="presentation"
      hidden={render ? undefined : true}
    >
      {heading && (
        <div ref={headingRef} cmdk-group-heading="" aria-hidden id={headingId}>
          {heading}
        </div>
      )}
      <div cmdk-group-items="" role="group" aria-labelledby={heading ? headingId : undefined}>
        <GroupContext.Provider value={contextValue}>{children}</GroupContext.Provider>
      </div>
    </div>
  );
});
Group.displayName = 'CommandGroup';

/**
 * A visual and semantic separator between items or groups.
 * Visible when the search query is empty or `alwaysRender` is true, hidden otherwise.
 */
const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>((props, forwardedRef) => {
  const { alwaysRender, ...etc } = props;
  const render = useCmdk(state => !state.search);

  if (!alwaysRender && !render) return null;
  return <div ref={forwardedRef} {...etc} cmdk-separator="" role="separator" />;
});
Separator.displayName = 'CommandSeparator';

/**
 * Command menu input.
 * All props are forwarded to the underlying `input` element.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>((props, forwardedRef) => {
  const { onValueChange, ...etc } = props;
  const isControlled = props.value != null;
  const store = useStore();
  const search = useCmdk(state => state.search);
  const selectedItemId = useCmdk(state => state.selectedItemId);
  const context = useCommand();

  React.useEffect(() => {
    if (props.value != null) {
      store.setState('search', props.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);

  return (
    <input
      ref={forwardedRef}
      {...etc}
      cmdk-input=""
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      aria-autocomplete="list"
      role="combobox"
      aria-expanded={true}
      aria-controls={context.listId}
      aria-labelledby={context.labelId}
      aria-activedescendant={selectedItemId}
      id={context.inputId}
      type="text"
      value={isControlled ? props.value : search}
      onChange={e => {
        if (!isControlled) {
          store.setState('search', e.target.value);
        }

        onValueChange?.(e.target.value);
      }}
    />
  );
});
Input.displayName = 'CommandInput';

/**
 * Contains `Item`, `Group`, and `Separator`.
 * Use the `--cmdk-list-height` CSS variable to animate height based on the number of results.
 */
const List = React.forwardRef<HTMLDivElement, ListProps>((props, forwardedRef) => {
  const { children, label = 'Suggestions', ...etc } = props;
  const ref = React.useRef<HTMLDivElement>(null);
  const height = React.useRef<HTMLDivElement>(null);
  const selectedItemId = useCmdk(state => state.selectedItemId);
  const context = useCommand();

  React.useEffect(() => {
    if (height.current && ref.current) {
      const el = height.current;
      const wrapper = ref.current;
      let animationFrame: number | undefined;
      const observer = new ResizeObserver(() => {
        animationFrame = requestAnimationFrame(() => {
          const height = el.offsetHeight;
          wrapper.style.setProperty(`--cmdk-list-height`, height.toFixed(1) + 'px');
        });
      });
      observer.observe(el);
      return () => {
        if (animationFrame !== undefined) {
          cancelAnimationFrame(animationFrame);
        }
        observer.unobserve(el);
      };
    }
  }, []);

  return (
    <div
      ref={mergeRefs([ref, forwardedRef])}
      {...etc}
      cmdk-list=""
      role="listbox"
      tabIndex={-1}
      aria-activedescendant={selectedItemId}
      aria-label={label}
      id={context.listId}
    >
      <div ref={mergeRefs([height, context.listInnerRef])} cmdk-list-sizer="">
        {children}
      </div>
    </div>
  );
});
List.displayName = 'CommandList';

/**
 * Automatically renders when there are no results for the search query.
 */
const Empty = React.forwardRef<HTMLDivElement, EmptyProps>((props, forwardedRef) => {
  const render = useCmdk(state => state.filtered.count === 0);

  if (!render) return null;
  return <div ref={forwardedRef} {...props} cmdk-empty="" role="presentation" />;
});
Empty.displayName = 'CommandEmpty';

const pkg = Object.assign(Command, {
  List,
  Item,
  Input,
  Group,
  Separator,
  Empty,
});

// Exported under the `CommandPrimitive*` names (rather than bare `Command*`)
// because `src/lib/widgets/editor/ui/command.tsx` (re-exported from the
// `src/ui` barrel as `Command`, `CommandList`, etc.) already owns those
// names for the styled composite built on top of this headless layer —
// see `src/ui/README.md`'s re-export policy (single barrel, no
// re-grouping) and DCMS-599.
export { useCmdk as useCommandState };
export { pkg as CommandPrimitive };
export { defaultFilter };

export { Command as CommandPrimitiveRoot };
export { List as CommandPrimitiveList };
export { Item as CommandPrimitiveItem };
export { Input as CommandPrimitiveInput };
export { Group as CommandPrimitiveGroup };
export { Separator as CommandPrimitiveSeparator };
export { Empty as CommandPrimitiveEmpty };

/**
 * Helpers
 */

function findNextSibling(el: Element, selector: string) {
  let sibling = el.nextElementSibling;

  while (sibling) {
    if (sibling.matches(selector)) return sibling;
    sibling = sibling.nextElementSibling;
  }
  return null;
}

function findPreviousSibling(el: Element, selector: string) {
  let sibling = el.previousElementSibling;

  while (sibling) {
    if (sibling.matches(selector)) return sibling;
    sibling = sibling.previousElementSibling;
  }
  return null;
}

function useAsRef<T>(data: T) {
  const ref = React.useRef<T>(data);

  useLayoutEffect(() => {
    ref.current = data;
  });

  return ref;
}

const useLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

function useLazyRef<T>(fn: () => T) {
  const ref = React.useRef<T | undefined>(undefined);

  if (ref.current === undefined) {
    ref.current = fn();
  }

  return ref as React.MutableRefObject<T>;
}

/** Run a selector against the store state. */
function useCmdk<T>(selector: (state: State) => T): T {
  const store = useStore();
  const cb = () => selector(store.snapshot());
  return React.useSyncExternalStore(store.subscribe, cb, cb);
}

function useValue(
  id: string,
  ref: React.RefObject<HTMLElement | null>,
  deps: (string | React.ReactNode | React.RefObject<HTMLElement | null>)[],
  aliases: string[] = [],
) {
  const valueRef = React.useRef<string | undefined>(undefined);
  const context = useCommand();

  useLayoutEffect(() => {
    const value = (() => {
      for (const part of deps) {
        if (typeof part === 'string') {
          return part.trim();
        }

        if (typeof part === 'object' && part !== null && 'current' in part) {
          if (part.current) {
            return part.current.textContent?.trim();
          }
          return valueRef.current;
        }
      }
      return undefined;
    })();

    const keywords = aliases.map(alias => alias.trim());

    if (value) {
      context.value(id, value, keywords);
      ref.current?.setAttribute(VALUE_ATTR, value);
      valueRef.current = value;
    }
  });

  return valueRef;
}

/** Imperatively run a function on the next layout effect cycle. */
const useScheduleLayoutEffect = () => {
  const [s, ss] = React.useState<object | undefined>();
  const fns = useLazyRef(() => new Map<string | number, () => void>());

  useLayoutEffect(() => {
    fns.current.forEach(f => f());
    fns.current = new Map();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  return (id: string | number, cb: () => void) => {
    fns.current.set(id, cb);
    ss({});
  };
};

// ESM is still a nightmare with Next.js so upstream just copies the package code in:
// https://github.com/gregberge/react-merge-refs
// Copyright (c) 2020 Greg Berge
function mergeRefs<T = unknown>(
  refs: Array<React.MutableRefObject<T> | React.LegacyRef<T>>,
): React.RefCallback<T> {
  return value => {
    refs.forEach(ref => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

const srOnlyStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: '0',
};

/**
 * Fuzzy command-score matcher.
 *
 * Vendored from `cmdk-base`'s `command-score.ts`, itself a fork of
 * https://github.com/pacocoursey/cmdk/blob/main/cmdk/src/command-score.ts
 * (MIT). Inlined here (rather than kept as a sibling file) to keep this a
 * single vendored file, per DCMS-549.
 *
 * The scores are arranged so that a continuous match of characters will
 * result in a total score of 1.
 */
const SCORE_CONTINUE_MATCH = 1;
// A new match at the start of a word scores better than a new match
// elsewhere as it's more likely that the user will type the starts of
// fragments. Word jumps between spaces score slightly higher than
// slashes, brackets, hyphens, etc.
const SCORE_SPACE_WORD_JUMP = 0.9;
const SCORE_NON_SPACE_WORD_JUMP = 0.8;
// Any other match isn't ideal, but we include it for completeness.
const SCORE_CHARACTER_JUMP = 0.17;
// If the user transposed two letters, it should be significantly penalized.
// i.e. "ouch" is more likely than "curtain" when "uc" is typed.
const SCORE_TRANSPOSITION = 0.1;
// The goodness of a match should decay slightly with each missing character.
// i.e. "bad" is more likely than "bard" when "bd" is typed. This will not
// change the order of suggestions based on SCORE_* until 100 characters are
// inserted between matches.
const PENALTY_SKIPPED = 0.999;
// The goodness of an exact-case match should be higher than a
// case-insensitive match by a small amount. i.e. "HTML" is more likely
// than "haml" when "HM" is typed. This will not change the order of
// suggestions based on SCORE_* until 1000 characters are inserted between
// matches.
const PENALTY_CASE_MISMATCH = 0.9999;
// If the word has more characters than the user typed, it should be
// penalised slightly. i.e. "html" is more likely than "html5" if I type
// "html".
const PENALTY_NOT_COMPLETE = 0.99;

const IS_GAP_REGEXP = /[\\/_+.#"@[({&]/;
const COUNT_GAPS_REGEXP = /[\\/_+.#"@[({&]/g;
const IS_SPACE_REGEXP = /[\s-]/;
const COUNT_SPACE_REGEXP = /[\s-]/g;

function commandScoreInner(
  value: string,
  abbreviation: string,
  lowerString: string,
  lowerAbbreviation: string,
  stringIndex: number,
  abbreviationIndex: number,
  memoizedResults: Record<string, number>,
): number {
  if (abbreviationIndex === abbreviation.length) {
    if (stringIndex === value.length) {
      return SCORE_CONTINUE_MATCH;
    }
    return PENALTY_NOT_COMPLETE;
  }

  const memoizeKey = `${stringIndex},${abbreviationIndex}`;
  if (memoizedResults[memoizeKey] !== undefined) {
    return memoizedResults[memoizeKey];
  }

  const abbreviationChar = lowerAbbreviation.charAt(abbreviationIndex);
  let index = lowerString.indexOf(abbreviationChar, stringIndex);
  let highScore = 0;

  let score, transposedScore, wordBreaks, spaceBreaks;

  while (index >= 0) {
    score = commandScoreInner(
      value,
      abbreviation,
      lowerString,
      lowerAbbreviation,
      index + 1,
      abbreviationIndex + 1,
      memoizedResults,
    );
    if (score > highScore) {
      if (index === stringIndex) {
        score *= SCORE_CONTINUE_MATCH;
      } else if (IS_GAP_REGEXP.test(value.charAt(index - 1))) {
        score *= SCORE_NON_SPACE_WORD_JUMP;
        wordBreaks = value.slice(stringIndex, index - 1).match(COUNT_GAPS_REGEXP);
        if (wordBreaks && stringIndex > 0) {
          score *= Math.pow(PENALTY_SKIPPED, wordBreaks.length);
        }
      } else if (IS_SPACE_REGEXP.test(value.charAt(index - 1))) {
        score *= SCORE_SPACE_WORD_JUMP;
        spaceBreaks = value.slice(stringIndex, index - 1).match(COUNT_SPACE_REGEXP);
        if (spaceBreaks && stringIndex > 0) {
          score *= Math.pow(PENALTY_SKIPPED, spaceBreaks.length);
        }
      } else {
        score *= SCORE_CHARACTER_JUMP;
        if (stringIndex > 0) {
          score *= Math.pow(PENALTY_SKIPPED, index - stringIndex);
        }
      }

      if (value.charAt(index) !== abbreviation.charAt(abbreviationIndex)) {
        score *= PENALTY_CASE_MISMATCH;
      }
    }

    if (
      (score < SCORE_TRANSPOSITION
        && lowerString.charAt(index - 1) === lowerAbbreviation.charAt(abbreviationIndex + 1))
      || (lowerAbbreviation.charAt(abbreviationIndex + 1)
          === lowerAbbreviation.charAt(abbreviationIndex) // allow duplicate letters, ref pacocoursey/cmdk#7428
        && lowerString.charAt(index - 1) !== lowerAbbreviation.charAt(abbreviationIndex))
    ) {
      transposedScore = commandScoreInner(
        value,
        abbreviation,
        lowerString,
        lowerAbbreviation,
        index + 1,
        abbreviationIndex + 2,
        memoizedResults,
      );

      if (transposedScore * SCORE_TRANSPOSITION > score) {
        score = transposedScore * SCORE_TRANSPOSITION;
      }
    }

    if (score > highScore) {
      highScore = score;
    }

    index = lowerString.indexOf(abbreviationChar, index + 1);
  }

  memoizedResults[memoizeKey] = highScore;
  return highScore;
}

function formatInput(value: string) {
  // convert all valid space characters to space so they match each other
  return value.toLowerCase().replace(COUNT_SPACE_REGEXP, ' ');
}

function commandScore(value: string, abbreviation: string, aliases: string[] = []): number {
  /*
   * In the original, lower-casing was done on each recursive call, but this
   * meant that toLowerCase() was the dominating cost in the algorithm.
   * Passing both is a little uglier, but considerably faster.
   */
  const string = aliases.length > 0 ? `${value} ${aliases.join(' ')}` : value;
  return commandScoreInner(
    string,
    abbreviation,
    formatInput(string),
    formatInput(abbreviation),
    0,
    0,
    {},
  );
}

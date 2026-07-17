import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { createNewEntry } from '@/core/actions/collections';
import { openMediaLibrary as openMediaLibraryAction } from '@/core/actions/mediaLibrary';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { useShortcut } from '@/core/hooks/useShortcut';
import { registerShortcut } from '@/core/lib/shortcuts';
import { useLaikaShell } from './LaikaShellContext';
import { focusSiblingNavItem } from './listNav';

import type { CmsCollections, CmsCollectionState } from '@/lib/util/index';

/**
 * Registers the laika shell's global keyboard shortcuts (Linear-style
 * single keys and 'g' chords) into core's shortcut engine. Renders
 * nothing; mounted once in LaikaLayout so every page gets them.
 *
 * This component is deliberately just a consumer of the engine: a host app
 * embedding LaikaApp can register additional shortcuts with the same
 * `useShortcut` hook (they show up in LaikaShortcutHelp automatically), or
 * override one of these by registering the same id.
 */

export const LAIKA_SHORTCUT_GROUPS = {
  navigation: 'Navigation',
  search: 'Search',
  lists: 'Lists',
  editor: 'Editor',
  help: 'Help',
} as const;

/**
 * The 'g <key>' chord key for each visible collection, by collection name.
 * A collection with a valid configured `shortcut` (single letter/digit in
 * config.yml) uses that key; the rest fall back to their 1-based sidebar
 * position, first nine only. Configured keys win over app-shell defaults
 * on conflict (they register later, and the engine prefers the last
 * registration), so `shortcut: m` deliberately beats 'g m' media library.
 */
export function collectionChordKeys(collections: CmsCollectionState[]): Map<string, string> {
  const keys = new Map<string, string>();
  collections.forEach((collection, index) => {
    const configured = typeof collection.shortcut === 'string' && /^[a-zA-Z0-9]$/.test(collection.shortcut)
      ? collection.shortcut.toLowerCase()
      : null;
    if (configured) {
      keys.set(collection.name, configured);
    } else if (index < 9) {
      keys.set(collection.name, String(index + 1));
    }
  });
  return keys;
}

/** The collection currently scoping the page, based on the route. */
function useRouteCollection(): CmsCollectionState | undefined {
  const location = useLocation();
  const collections = useAppSelector(state => state.collections) as CmsCollections | undefined;
  const match = location.pathname.match(/^\/collections\/([^/]+)/);
  return match && collections ? collections[match[1]] : undefined;
}

function LaikaShortcuts() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const collections = useAppSelector(state => state.collections) as CmsCollections | undefined;
  const hasWorkflow = useAppSelector(state => state.config?.publish_mode === 'editorial_workflow');
  const showMediaButton = useAppSelector(state => state.mediaLibrary?.showMediaButton);
  const routeCollection = useRouteCollection();
  const { openCommandPalette, toggleShortcutHelp } = useLaikaShell();

  useShortcut({
    id: 'laika.nav.dashboard',
    sequence: 'g d',
    label: 'Go to dashboard',
    group: LAIKA_SHORTCUT_GROUPS.navigation,
    run: () => navigate('/'),
  });

  useShortcut(
    hasWorkflow
      ? {
        id: 'laika.nav.workflow',
        sequence: 'g w',
        label: 'Go to workflow',
        group: LAIKA_SHORTCUT_GROUPS.navigation,
        run: () => navigate('/workflow'),
      }
      : null,
  );

  useShortcut({
    id: 'laika.nav.settings',
    sequence: 'g s',
    label: 'Go to app settings',
    group: LAIKA_SHORTCUT_GROUPS.navigation,
    run: () => navigate('/settings'),
  });

  useShortcut(
    showMediaButton
      ? {
        id: 'laika.nav.media',
        sequence: 'g m',
        label: 'Open media library',
        group: LAIKA_SHORTCUT_GROUPS.navigation,
        run: () => {
          dispatch(openMediaLibraryAction());
        },
      }
      : null,
  );

  useShortcut(
    routeCollection?.create
      ? {
        id: 'laika.entry.new',
        sequence: 'n',
        label: `New entry in ${routeCollection.label}`,
        group: LAIKA_SHORTCUT_GROUPS.navigation,
        run: () => createNewEntry(routeCollection.name),
      }
      : null,
  );

  useShortcut({
    id: 'laika.search.palette',
    sequence: '/',
    label: 'Search / command palette',
    group: LAIKA_SHORTCUT_GROUPS.search,
    run: openCommandPalette,
  });

  useShortcut({
    id: 'laika.list.next',
    sequence: 'j',
    label: 'Focus next item',
    group: LAIKA_SHORTCUT_GROUPS.lists,
    run: () => {
      focusSiblingNavItem(1);
    },
  });

  useShortcut({
    id: 'laika.list.previous',
    sequence: 'k',
    label: 'Focus previous item',
    group: LAIKA_SHORTCUT_GROUPS.lists,
    run: () => {
      focusSiblingNavItem(-1);
    },
  });

  useShortcut({
    id: 'laika.help.shortcuts',
    sequence: '?',
    label: 'Keyboard shortcuts help',
    group: LAIKA_SHORTCUT_GROUPS.help,
    run: toggleShortcutHelp,
  });

  // Per-collection 'g <key>' chords: a configured `shortcut` key, or the
  // 1-based sidebar position for the first nine (see collectionChordKeys).
  // Registered imperatively (not via useShortcut) because the set varies
  // with config.
  const visibleCollections = React.useMemo<CmsCollectionState[]>(
    () => Object.values((collections ?? {}) as CmsCollections).filter(c => c.hide !== true),
    [collections],
  );
  React.useEffect(() => {
    const chordKeys = collectionChordKeys(visibleCollections);
    const disposers = visibleCollections
      .filter(collection => chordKeys.has(collection.name))
      .map(collection =>
        registerShortcut({
          id: `laika.nav.collection.${collection.name}`,
          sequence: `g ${chordKeys.get(collection.name)}`,
          label: `Go to ${collection.label}`,
          group: LAIKA_SHORTCUT_GROUPS.navigation,
          run: () => navigate(`/collections/${collection.name}`),
        })
      );
    return () => disposers.forEach(dispose => dispose());
  }, [visibleCollections, navigate]);

  return null;
}

export default LaikaShortcuts;

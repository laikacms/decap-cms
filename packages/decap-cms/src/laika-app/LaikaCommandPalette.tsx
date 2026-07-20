import { Autocomplete } from '@base-ui/react/autocomplete';
import styled from '@emotion/styled';
import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { searchCollections } from '@/core/actions/collections';
import { openMediaLibrary as openMediaLibraryAction } from '@/core/actions/mediaLibrary';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { useShortcut } from '@/core/hooks/useShortcut';
import { formatSequence } from '@/core/lib/shortcuts';
import { colors, Icon } from '@/ui/default/index';
import { useLaikaShell } from './LaikaShellContext';
import { collectionChordKeys, LAIKA_SHORTCUT_GROUPS } from './LaikaShortcuts';
import { LaikaBadge, LaikaDialog, LaikaSearchInput } from './ui';

import type { CmsCollections, CmsCollectionState } from '@/lib/util/index';
import type { LaikaBadgeIntent } from './ui';

/**
 * Cmd+K / Ctrl+K global command palette. Lives in LaikaLayout so it's
 * accessible from every page. Listens for the shortcut at the window
 * level, opens a LaikaDialog with a LaikaSearchInput, and lets users
 * jump to any collection, the dashboard, the workflow board, or open
 * the media library.
 *
 * The listbox itself is a Base UI Autocomplete rendered inline (no
 * popup): Base UI provides combobox a11y (aria-activedescendant,
 * aria-expanded), keyboard navigation, hover highlighting, and
 * scroll-into-view. Filtering stays in our own code (mode="none"),
 * so the ranked `filtered` list is fed to Base UI as-is.
 *
 * Pure laika-app component, no core changes. Open state lives in
 * LaikaShellContext so other shell surfaces (e.g. the shortcut badge in
 * the sidebar search bar) can open the palette too; navigation goes
 * through react-router; media library opens via the existing core action
 * so the modal logic is unchanged.
 */

type CommandKind = 'page' | 'collection' | 'action';

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  kind: CommandKind;
  icon: 'page' | 'write' | 'workflow' | 'media-alt' | 'home' | 'search' | 'settings' | 'info-circle';
  badge?: { intent: LaikaBadgeIntent, text: string };
  /** Global shortcut sequence for this command, shown as a kbd hint. */
  shortcut?: string;
  run: () => void;
}

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 16px 8px;
`;

const Results = styled(Autocomplete.List)`
  margin: 0;
  padding: 4px 0 8px;
  max-height: 360px;
  overflow-y: auto;

  &:empty {
    display: none;
  }
`;

const ResultItem = styled(Autocomplete.Item)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  background-color: transparent;
  color: ${colors.textLead};
  transition:
    background-color 0.1s ease,
    color 0.1s ease;

  &:hover,
  &[data-highlighted] {
    background-color: ${colors.activeBackground};
    color: ${colors.active};
  }
`;

const ItemIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background-color: ${colors.activeBackground};
  color: ${colors.active};
  flex-shrink: 0;
`;

const ItemMeta = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`;

const ItemLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ItemHint = styled.div`
  font-size: 12px;
  color: ${colors.controlLabel};
`;

/**
 * Base UI's Empty part must stay mounted for screen-reader announcements,
 * so the "no matches" chrome is only applied when it actually has content.
 */
const Empty = styled(Autocomplete.Empty)`
  &:not(:empty) {
    padding: 32px 16px;
    text-align: center;
    color: ${colors.controlLabel};
    font-size: 13px;
  }
`;

const ItemShortcut = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
`;

const Hint = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid ${colors.textFieldBorder};
  font-size: 11px;
  color: ${colors.controlLabel};
`;

const Kbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  margin: 0 2px;
  border-radius: 4px;
  border: 1px solid ${colors.textFieldBorder};
  background-color: ${colors.background};
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  color: ${colors.controlLabel};
`;

function LaikaCommandPalette() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const params = useParams();
  const collections = useAppSelector(state => state.collections) as CmsCollections | undefined;
  const hasWorkflow = useAppSelector(state => state.config?.publish_mode === 'editorial_workflow');
  const showMediaButton = useAppSelector(state => state.mediaLibrary?.showMediaButton);
  const isSearchEnabled = useAppSelector(state => state.config?.search !== false);

  const {
    isCommandPaletteOpen,
    closeCommandPalette: close,
    toggleCommandPalette,
    openShortcutHelp,
  } = useLaikaShell();
  const [query, setQuery] = React.useState('');

  // Reset the query on close no matter how the palette was dismissed
  // (Escape, item selection, Cmd+K toggle, or another shell surface).
  React.useEffect(() => {
    if (!isCommandPaletteOpen) {
      setQuery('');
    }
  }, [isCommandPaletteOpen]);

  // Cmd+K on macOS, Ctrl+K elsewhere ('mod' matches either). Registered
  // through core's shortcut engine so it appears in the help dialog;
  // `allowWhileSuspended` keeps the toggle working from inside the open
  // palette (which, as a LaikaDialog, suspends everything else).
  useShortcut({
    id: 'laika.search.paletteToggle',
    sequence: 'mod+k',
    label: 'Toggle command palette',
    group: LAIKA_SHORTCUT_GROUPS.search,
    allowInInput: true,
    allowWhileSuspended: true,
    run: toggleCommandPalette,
  });

  const items = React.useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];
    list.push({
      id: 'home',
      label: 'Dashboard',
      hint: 'Go to home',
      kind: 'page',
      icon: 'home',
      shortcut: 'g d',
      run: () => navigate('/'),
    });
    if (collections) {
      const visible = Object.values(collections).filter((c: CmsCollectionState) => c.hide !== true);
      const chordKeys = collectionChordKeys(visible);
      visible.forEach((c: CmsCollectionState) => {
        const chordKey = chordKeys.get(c.name);
        list.push({
          id: 'collection:' + c.name,
          label: c.label,
          hint: c.type === 'file_based_collection' ? 'File collection' : 'Folder collection',
          kind: 'collection',
          icon: c.type === 'file_based_collection' ? 'page' : 'write',
          shortcut: chordKey ? `g ${chordKey}` : undefined,
          run: () => navigate('/collections/' + c.name),
        });
      });
    }
    if (hasWorkflow) {
      list.push({
        id: 'workflow',
        label: 'Workflow',
        hint: 'Editorial workflow board',
        kind: 'page',
        icon: 'workflow',
        shortcut: 'g w',
        run: () => navigate('/workflow'),
      });
    }
    if (showMediaButton) {
      list.push({
        id: 'media',
        label: 'Media library',
        hint: 'Open media picker',
        kind: 'action',
        icon: 'media-alt',
        shortcut: 'g m',
        run: () => {
          dispatch(openMediaLibraryAction());
        },
      });
    }
    list.push({
      id: 'settings',
      label: 'App settings',
      hint: 'Go to settings',
      kind: 'page',
      icon: 'settings',
      shortcut: 'g s',
      run: () => navigate('/settings'),
    });
    list.push({
      id: 'shortcut-help',
      label: 'Keyboard shortcuts',
      hint: 'Show all shortcuts',
      kind: 'action',
      icon: 'info-circle',
      shortcut: '?',
      run: openShortcutHelp,
    });
    return list;
  }, [collections, hasWorkflow, showMediaButton, dispatch, navigate, openShortcutHelp]);

  const filtered = React.useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return items;

    const term = trimmed.toLowerCase();
    const matchedNav = items.filter(item => item.label.toLowerCase().includes(term));

    // Surface "search for <query>" as the first action so users can always
    // pivot from the palette into a real search-results page even when
    // their query doesn't match any nav item directly. Skipped entirely
    // when entry search is disabled in config (`search: false`), same as
    // the sidebar trigger.
    const searchActions: CommandItem[] = [];
    if (!isSearchEnabled) {
      return matchedNav;
    }
    const onCollectionRoute = location.pathname.startsWith('/collections/');
    const scopedCollectionName = onCollectionRoute
      ? (params.name as string | undefined)
      : undefined;
    const scopedCollection = scopedCollectionName && collections ? collections[scopedCollectionName] : undefined;

    if (scopedCollection) {
      searchActions.push({
        id: 'search-in-collection',
        label: 'Search in ' + scopedCollection.label + ' for "' + trimmed + '"',
        hint: 'Open the in-collection search results',
        kind: 'action',
        icon: 'search',
        run: () => searchCollections(trimmed, scopedCollection.name),
      });
    }
    searchActions.push({
      id: 'search-all',
      label: 'Search all collections for "' + trimmed + '"',
      hint: 'Open the global search results',
      kind: 'action',
      icon: 'search',
      run: () => searchCollections(trimmed, ''),
    });

    return [...searchActions, ...matchedNav];
  }, [items, query, location.pathname, params, collections, isSearchEnabled]);

  const runItem = React.useCallback(
    (item: CommandItem) => {
      item.run();
      close();
    },
    [close],
  );

  return (
    <LaikaDialog
      isOpen={isCommandPaletteOpen}
      onClose={close}
      width="560px"
      showCloseButton={false}
      ariaLabel="Command palette"
    >
      <Autocomplete.Root
        inline
        open
        mode="none"
        autoHighlight="always"
        keepHighlight
        items={filtered}
        value={query}
        onValueChange={setQuery}
        onOpenChange={open => {
          // The inline list is forced open; the only "close" Base UI can
          // request is Escape, which should dismiss the whole palette.
          if (!open) {
            close();
          }
        }}
      >
        <Body>
          <Autocomplete.Input
            render={<LaikaSearchInput />}
            autoFocus
            placeholder="Search collections, pages, actions…"
            aria-label="Command palette"
          />
        </Body>
        <Empty>No matches.</Empty>
        <Results>
          {(item: CommandItem) => (
            <ResultItem key={item.id} value={item} onClick={() => runItem(item)}>
              <ItemIcon>
                <Icon type={item.icon} />
              </ItemIcon>
              <ItemMeta>
                <ItemLabel>{item.label}</ItemLabel>
                {item.hint ? <ItemHint>{item.hint}</ItemHint> : null}
              </ItemMeta>
              {item.badge ? <LaikaBadge intent={item.badge.intent}>{item.badge.text}</LaikaBadge> : null}
              {item.shortcut
                ? (
                  <ItemShortcut aria-hidden="true">
                    {formatSequence(item.shortcut).map((chunk, index) => <Kbd key={index}>{chunk}</Kbd>)}
                  </ItemShortcut>
                )
                : null}
            </ResultItem>
          )}
        </Results>
        <Hint>
          <span>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            to navigate
          </span>
          <span>
            <Kbd>↵</Kbd>
            to select
          </span>
          <span>
            <Kbd>Esc</Kbd>
            to close
          </span>
        </Hint>
      </Autocomplete.Root>
    </LaikaDialog>
  );
}

export default LaikaCommandPalette;

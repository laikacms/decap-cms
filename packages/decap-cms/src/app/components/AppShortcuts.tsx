import React, { useCallback, useState } from 'react';

import { ShortcutHelp } from '@/core/components/UI';
import { useCollectionChordShortcuts } from '@/core/hooks/useCollectionChordShortcuts';
import { useNavigate } from '@/core/hooks/useNavigate';
import { useShortcut } from '@/core/hooks/useShortcut';

import type { CmsCollections } from '@/lib/util/index';

/**
 * Global keyboard shortcuts for the standard app shell: 'g <key>' chords to
 * jump to each collection (its configured `shortcut`, else 'g 1'..'g 9' by
 * sidebar position), 'g w' for the workflow board, and '?' for the help
 * dialog. Renders the dialog; mounted once in AppContent while signed in.
 */

const SHORTCUT_GROUP = 'Navigation';

interface AppShortcutsProps {
  collections: CmsCollections;
  hasWorkflow: boolean;
}

function AppShortcuts({ collections, hasWorkflow }: AppShortcutsProps) {
  const navigate = useNavigate();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const toggleHelp = useCallback(() => setIsHelpOpen(open => !open), []);
  const closeHelp = useCallback(() => setIsHelpOpen(false), []);

  const collectionList = React.useMemo(() => Object.values(collections), [collections]);
  useCollectionChordShortcuts({
    collections: collectionList,
    idPrefix: 'app.nav.collection',
    group: SHORTCUT_GROUP,
    go: collection => navigate('collection', { collectionName: collection.name }),
  });

  useShortcut(
    hasWorkflow
      ? {
        id: 'app.nav.workflow',
        sequence: 'g w',
        label: 'Go to workflow',
        group: SHORTCUT_GROUP,
        run: () => navigate('workflow'),
      }
      : null,
  );

  useShortcut({
    id: 'app.help.shortcuts',
    sequence: '?',
    label: 'Keyboard shortcuts help',
    group: 'Help',
    run: toggleHelp,
  });

  return <ShortcutHelp isOpen={isHelpOpen} onClose={closeHelp} />;
}

export default AppShortcuts;

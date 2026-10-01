import styled from '@emotion/styled';
import React from 'react';

import { useRegisteredShortcuts } from '@/core/hooks/useShortcut';
import { formatSequence, groupShortcuts } from '@/core/lib/shortcuts';
import { colors } from '@/ui/default/index';
import { useLaikaShell } from './LaikaShellContext';
import { LaikaDialog } from './ui';

/**
 * "Keyboard shortcuts" dialog, opened with '?' (registered in
 * LaikaShortcuts) or from the command palette. Renders whatever is in
 * core's shortcut registry, grouped by each shortcut's `group`, so
 * host-registered shortcuts appear here without extra wiring.
 */

const Groups = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 60vh;
  overflow-y: auto;
`;

const GroupHeading = styled.h3`
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${colors.controlLabel};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 0;
  font-size: 14px;
  color: ${colors.textLead};
`;

const Keys = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

const Kbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 4px;
  border: 1px solid ${colors.textFieldBorder};
  background-color: ${colors.background};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: ${colors.controlLabel};
`;

function LaikaShortcutHelp() {
  const { isShortcutHelpOpen, closeShortcutHelp } = useLaikaShell();
  const shortcuts = useRegisteredShortcuts();
  const grouped = React.useMemo(() => groupShortcuts(shortcuts), [shortcuts]);

  return (
    <LaikaDialog
      isOpen={isShortcutHelpOpen}
      onClose={closeShortcutHelp}
      title="Keyboard shortcuts"
      width="480px"
    >
      <LaikaDialog.Body>
        <Groups>
          {grouped.map(([group, entries]) => (
            <section key={group}>
              <GroupHeading>{group}</GroupHeading>
              {entries.map(shortcut => (
                <Row key={shortcut.id}>
                  <span>{shortcut.label}</span>
                  <Keys>
                    {formatSequence(shortcut.sequence).map((chunk, index) => <Kbd key={index}>{chunk}</Kbd>)}
                  </Keys>
                </Row>
              ))}
            </section>
          ))}
        </Groups>
      </LaikaDialog.Body>
    </LaikaDialog>
  );
}

export default LaikaShortcutHelp;

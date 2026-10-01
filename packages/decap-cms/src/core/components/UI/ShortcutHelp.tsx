import styled from '@emotion/styled';
import React from 'react';

import { useRegisteredShortcuts, useSuspendShortcuts } from '@/core/hooks/useShortcut';
import { formatSequence, groupShortcuts } from '@/core/lib/shortcuts';
import { colors } from '@/ui/default/index';
import { Modal } from './Modal';

/**
 * "Keyboard shortcuts" dialog for the standard app shell. Lists whatever is
 * in core's shortcut registry, grouped by each shortcut's `group`, so
 * host-registered shortcuts appear without extra wiring.
 */

const Panel = styled.div`
  text-align: left;
  width: 420px;
  max-width: 100%;
  max-height: 100%;
  overflow-y: auto;
`;

const Title = styled.h2`
  margin: 0 0 16px;
  font-size: 18px;
`;

const GroupHeading = styled.h3`
  margin: 16px 0 8px;
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
`;

const Keys = styled.span`
  display: inline-flex;
  gap: 4px;
  flex-shrink: 0;
`;

const Kbd = styled.kbd`
  min-width: 20px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid ${colors.textFieldBorder};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
`;

const TITLE_ID = 'shortcut-help-title';

export function ShortcutHelp({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  useSuspendShortcuts(isOpen);
  const shortcuts = useRegisteredShortcuts();
  const grouped = React.useMemo(() => groupShortcuts(shortcuts), [shortcuts]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabelledby={TITLE_ID}>
      <Panel>
        <Title id={TITLE_ID}>Keyboard shortcuts</Title>
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
      </Panel>
    </Modal>
  );
}

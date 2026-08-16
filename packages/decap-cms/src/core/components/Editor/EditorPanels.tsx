import styled from '@emotion/styled';
import React, { useMemo, useState } from 'react';

import { useLlmTransport } from '@/core/lib/llm';
import { useCmsSlots } from '@/core/lib/slots';
import { colors, Icon, lengths, shadows, zIndex } from '@/ui/default/index';
import AiChatPanel from './AiChatPanel/AiChatPanel';

import type { EditorPanel, EditorPanelRenderProps } from '@/core/lib/slots';
import type { TranslateFunction } from '@/ui/default/index';

/**
 * The editor's panel region: extra UI docked beside the entry form, as
 * opposed to `CmsSlots`' replace-a-region renderers.
 *
 * Deliberately a drawer rather than a third `SplitPane` pane. The editor's
 * split already coordinates a narrow-viewport direction flip, scroll sync and
 * the i18n dual-control-pane mode; threading a third pane through all of that
 * risks the everyday editing experience to serve an optional extra. An
 * overlaying drawer costs the layout nothing.
 *
 * With no panels this renders `null` — no toggle, no DOM, no behaviour change
 * for a deployment that has none, which is every deployment by default.
 */

const DRAWER_WIDTH = 380;

const ToggleButton = styled.button<{ $open: boolean }>`
  position: absolute;
  top: 50px;
  right: ${(props: { $open: boolean }) => (props.$open ? `${DRAWER_WIDTH + 10}px` : '10px')};
  z-index: ${zIndex.zIndex299};
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid ${colors.textFieldBorder};
  border-radius: ${lengths.borderRadius};
  background-color: ${colors.background};
  color: ${colors.controlLabel};
  cursor: pointer;
  transition: right 0.2s ease;

  &:hover,
  &:focus-visible {
    color: ${colors.active};
  }
`;

const Drawer = styled.aside`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: ${DRAWER_WIDTH}px;
  z-index: ${zIndex.zIndex299};
  display: flex;
  flex-direction: column;
  background-color: ${colors.background};
  border-left: 1px solid ${colors.textFieldBorder};
  box-shadow: ${shadows.dropDeep};
`;

const TabList = styled.div`
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid ${colors.textFieldBorder};
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px 12px;
  border: none;
  border-bottom: 2px solid
    ${(props: { $active: boolean }) => (props.$active ? colors.active : 'transparent')};
  background: none;
  color: ${(props: { $active: boolean }) => (props.$active ? colors.active : colors.controlLabel)};
  font-size: 14px;
  cursor: pointer;
`;

const PanelBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

export interface EditorPanelsProps {
  /** `onClose` is supplied by the drawer itself, so callers do not pass one. */
  panelProps: Omit<EditorPanelRenderProps, 'onClose'>;
  t: TranslateFunction;
}

function EditorPanels({ panelProps, t }: EditorPanelsProps) {
  const { editorPanels } = useCmsSlots();
  const transport = useLlmTransport();
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);

  const available = useMemo(
    () => {
      // The built-in assistant is a panel like any other, and appears only
      // when the deployment configured an `LlmTransport`.
      const builtIn: EditorPanel[] = transport
        ? [{
          id: 'ai-chat',
          label: t('editor.aiChat.title'),
          render: props => <AiChatPanel {...props} />,
        }]
        : [];

      return [...builtIn, ...(editorPanels ?? [])].filter((panel: EditorPanel) =>
        panel.isAvailable?.({ collection: panelProps.collection, entry: panelProps.entry }) ?? true
      );
    },
    [editorPanels, transport, t, panelProps.collection, panelProps.entry],
  );

  if (available.length === 0) {
    return null;
  }

  const active = available.find(panel => panel.id === activeId) ?? available[0];

  return (
    <>
      <ToggleButton
        type="button"
        $open={isOpen}
        onClick={() => setIsOpen(open => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen
          ? t('editor.editorInterface.closePanels')
          : t('editor.editorInterface.openPanels')}
      >
        <Icon type={isOpen ? 'close' : 'chevron'} size="small" direction={isOpen ? undefined : 'left'} />
        {!isOpen && available.length === 1 ? available[0].label : null}
      </ToggleButton>
      {isOpen && (
        <Drawer aria-label={t('editor.editorInterface.panels')}>
          {available.length > 1 && (
            <TabList role="tablist">
              {available.map(panel => (
                <Tab
                  key={panel.id}
                  type="button"
                  role="tab"
                  aria-selected={panel.id === active.id}
                  $active={panel.id === active.id}
                  onClick={() => setActiveId(panel.id)}
                >
                  {panel.label}
                </Tab>
              ))}
            </TabList>
          )}
          <PanelBody>
            {active.render({ ...panelProps, onClose: () => setIsOpen(false) })}
          </PanelBody>
        </Drawer>
      )}
    </>
  );
}

export default EditorPanels;

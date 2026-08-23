import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { BoldPlugin, CodePlugin, ItalicPlugin, StrikethroughPlugin } from '@platejs/basic-nodes/react';

import { colors, Toggle, transitions } from '@/ui/default/index';
import BlockquoteToolbarButton from './BlockquoteToolbarButton';
import EditorComponentsToolbarButton from './EditorComponentsToolbarButton';
import HeadingToolbarButton from './HeadingToolbarButton';
import LinkToolbarButton from './LinkToolbarButton';
import ListToolbarButton from './ListToolbarButton';
import MarkToolbarButton from './MarkToolbarButton';

import type { CmsWidgetTranslate } from '@/lib/util/index';
import type { EditorComponentsRegistry } from '@/widgets/richtext/types';

const ToolbarContainer = styled.div`
  background-color: ${colors.foreground};
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 14px;
  min-height: 58px;
  transition: background-color ${transitions.main}, color ${transitions.main};
  color: ${colors.text};
`;

const ToolbarToggle = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  font-size: 14px;
  margin: 0 10px;
`;

const StyledToggle = ToolbarToggle.withComponent(Toggle);

interface ToolbarToggleLabelProps {
  isActive?: boolean | undefined;
  offPosition?: boolean | undefined;
}

const ToolbarToggleLabel = styled.span<ToolbarToggleLabelProps>`
  display: inline-block;
  text-align: center;
  white-space: nowrap;
  line-height: 20px;
  min-width: ${props => (props.offPosition ? '62px' : '70px')};

  ${props =>
  props.isActive
  && css`
      font-weight: 600;
      color: ${colors.active};
    `};
`;

export interface ToolbarProps {
  buttons?: string[] | undefined;
  disabled?: boolean | undefined;
  onToggleMode: () => void;
  rawMode?: boolean | undefined;
  isShowModeToggle?: boolean | undefined;
  isEditorComponent?: boolean | undefined;
  editorComponents?: EditorComponentsRegistry | undefined;
  allowedEditorComponents?: string[] | undefined;
  t: CmsWidgetTranslate;
}

export default function Toolbar({
  buttons,
  disabled,
  t,
  rawMode,
  onToggleMode,
  isShowModeToggle,
  isEditorComponent,
  editorComponents,
  allowedEditorComponents,
}: ToolbarProps) {
  function isVisible(button: string) {
    return !Array.isArray(buttons) || buttons.includes(button);
  }

  return (
    <ToolbarContainer>
      <div>
        {isVisible('bold') && (
          <MarkToolbarButton
            type="bold"
            nodeType={BoldPlugin.key}
            label={t('editor.editorWidgets.markdown.bold')}
            icon="bold"
            disabled={disabled}
          />
        )}
        {isVisible('italic') && (
          <MarkToolbarButton
            type="italic"
            nodeType={ItalicPlugin.key}
            label={t('editor.editorWidgets.markdown.italic')}
            icon="italic"
            disabled={disabled}
          />
        )}
        {isVisible('strikethrough') && (
          <MarkToolbarButton
            type="strikethrough"
            nodeType={StrikethroughPlugin.key}
            label={t('editor.editorWidgets.markdown.strikethrough')}
            icon="strikethrough"
            disabled={disabled}
          />
        )}
        {isVisible('code') && (
          <MarkToolbarButton
            type="code"
            nodeType={CodePlugin.key}
            label={t('editor.editorWidgets.markdown.code')}
            icon="code"
            disabled={disabled}
          />
        )}
        {isVisible('link') && (
          <LinkToolbarButton
            type="link"
            label={t('editor.editorWidgets.markdown.link')}
            icon="link"
            disabled={disabled}
            t={t}
          />
        )}
        <HeadingToolbarButton isVisible={isVisible} disabled={disabled} t={t} />
        {isVisible('quote') && (
          <BlockquoteToolbarButton
            type="quote"
            label={t('editor.editorWidgets.markdown.quote')}
            icon="quote"
            disabled={disabled}
          />
        )}
        {isVisible('bulleted-list') && (
          <ListToolbarButton
            type="ul"
            label={t('editor.editorWidgets.markdown.bulletedList')}
            icon="list-bulleted"
            disabled={disabled}
          />
        )}
        {isVisible('numbered-list') && (
          <ListToolbarButton
            type="ol"
            label={t('editor.editorWidgets.markdown.numberedList')}
            icon="list-numbered"
            disabled={disabled}
          />
        )}
        <EditorComponentsToolbarButton
          disabled={disabled || isEditorComponent}
          t={t}
          editorComponents={editorComponents}
          allowedEditorComponents={allowedEditorComponents}
        />
      </div>
      {isShowModeToggle && (
        <ToolbarToggle>
          <ToolbarToggleLabel isActive={!rawMode} offPosition>
            {t('editor.editorWidgets.markdown.richText')}
          </ToolbarToggleLabel>
          <StyledToggle active={!!rawMode} onChange={onToggleMode} />
          <ToolbarToggleLabel isActive={rawMode}>
            {t('editor.editorWidgets.markdown.markdown')}
          </ToolbarToggleLabel>
        </ToolbarToggle>
      )}
    </ToolbarContainer>
  );
}

/** @jsxImportSource @emotion/react */
import styled from '@emotion/styled';
import React from 'react';

import { translate } from '@/core/i18n';
import { colors, Icon, zIndex } from '@/ui/default/index';
import { LaikaIconButton, LaikaTooltip } from './ui';

import type { EditorViewControlsRenderProps } from '@/app/components/index';
import type { TranslateFunction } from '@/ui/default/index';

/**
 * Laika-styled floating view controls inside the editor — pinned to the
 * top-right of the editor pane, toggles for i18n / preview / scroll sync.
 * Slotted into core via `renderEditorViewControls`.
 *
 * Each toggle uses LaikaIconButton with `active` state matching the
 * existing red Decap toggle, wrapped in LaikaTooltip for hover hints.
 */

const Cluster = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: ${zIndex.zIndex299};
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 9999px;
  background-color: ${colors.foreground};
  border: 1px solid ${colors.textFieldBorder};
  box-shadow: var(--laika-shadow-soft, 0 4px 12px rgba(15, 23, 42, 0.06));
`;

interface LaikaEditorViewControlsProps extends EditorViewControlsRenderProps {
  t: TranslateFunction;
}

function LaikaEditorViewControls({
  i18nEnabled,
  i18nVisible,
  onToggleI18n,
  previewEnabled,
  previewVisible,
  onTogglePreview,
  scrollSyncEnabled,
  scrollSyncVisible,
  onToggleScrollSync,
  t,
}: LaikaEditorViewControlsProps) {
  // Don't show the cluster at all when no toggles are available.
  if (!i18nEnabled && !previewEnabled && !scrollSyncVisible) {
    return null;
  }

  return (
    <Cluster role="group" aria-label="Editor view controls">
      {i18nEnabled
        ? (
          <LaikaTooltip content={t('editor.editorInterface.toggleI18n')} placement="bottom">
            <LaikaIconButton
              size="sm"
              active={i18nVisible}
              aria-label={t('editor.editorInterface.toggleI18n')}
              onClick={onToggleI18n}
            >
              <Icon type="page" />
            </LaikaIconButton>
          </LaikaTooltip>
        )
        : null}
      {previewEnabled
        ? (
          <LaikaTooltip content={t('editor.editorInterface.togglePreview')} placement="bottom">
            <LaikaIconButton
              size="sm"
              active={previewVisible}
              aria-label={t('editor.editorInterface.togglePreview')}
              onClick={onTogglePreview}
            >
              <Icon type="eye" />
            </LaikaIconButton>
          </LaikaTooltip>
        )
        : null}
      {scrollSyncVisible
        ? (
          <LaikaTooltip content={t('editor.editorInterface.toggleScrollSync')} placement="bottom">
            <LaikaIconButton
              size="sm"
              active={scrollSyncEnabled}
              aria-label={t('editor.editorInterface.toggleScrollSync')}
              onClick={onToggleScrollSync}
            >
              <Icon type="scroll" />
            </LaikaIconButton>
          </LaikaTooltip>
        )
        : null}
    </Cluster>
  );
}

export default translate()(LaikaEditorViewControls);

import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { confirmDialog } from '@laikacms/decap-cms/ui';
import { buttons, colors } from '@laikacms/decap-cms/ui-default';
import React from 'react';

import { useAiTranslate } from './useAiTranslate';

import type { CmsLocaleActionRenderProps } from '@laikacms/decap-cms/lib/util';

const TranslateButton = styled.button`
  ${buttons.button};
  ${buttons.medium};
  color: ${colors.controlLabel};
  background: ${colors.textFieldBorder};
  width: max-content;
  margin-top: 20px;
  margin-bottom: 20px;
  margin-right: 20px;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export interface TranslateActionProps extends CmsLocaleActionRenderProps {
  apiBasePath?: string | undefined;
  fetch?: typeof fetch | undefined;
}

export function TranslateAction({
  collection,
  entry,
  sourceLocale,
  targetLocale,
  getTranslatableFields,
  applyValue,
  t,
  apiBasePath,
  fetch: aiFetch,
}: TranslateActionProps) {
  const { translate, isTranslating, error } = useAiTranslate({
    apiBasePath,
    fetch: aiFetch,
  });

  async function translateFromSourceLocale() {
    if (
      !(await confirmDialog(
        t('editor.editorControlPane.i18n.translateFromDefaultConfirm', {
          locale: targetLocale.toUpperCase(),
        }),
        { title: t('editor.editorControlPane.i18n.translateFromDefaultConfirmTitle') },
      ))
    ) {
      return;
    }

    const fields = getTranslatableFields(sourceLocale, targetLocale);
    if (fields.length === 0) return;

    await translate({
      sourceLocale,
      targetLocale,
      slug: entry.slug,
      collection: collection.name,
      fields: fields.map(f => ({ name: f.name, value: f.value })),
      onFieldTranslated: applyValue,
    });
  }

  return (
    <>
      <TranslateButton
        type="button"
        disabled={isTranslating}
        onClick={translateFromSourceLocale}
      >
        {isTranslating
          ? t('editor.editorControlPane.i18n.translatingFromDefault')
          : t('editor.editorControlPane.i18n.translateFromDefault', {
            locale: sourceLocale.toUpperCase(),
          })}
      </TranslateButton>
      {error && (
        <div css={css`color: ${colors.errorText}; margin-bottom: 16px;`}>
          {t('editor.editorControlPane.i18n.translateFailed', { error })}
        </div>
      )}
    </>
  );
}

export default TranslateAction;

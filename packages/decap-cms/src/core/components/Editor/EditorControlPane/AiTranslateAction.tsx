import styled from '@emotion/styled';
import React, { useState } from 'react';

import { useLlmTransport } from '@/core/lib/llm';
import { useLlmSession, useLlmSessionUpdates } from '@/core/lib/llmSession';
import { confirmDialog } from '@/ui';
import { buttons, colors } from '@/ui/default/index';

import type { CmsLocaleActionRenderProps, LlmTranslatableField } from '@/lib/util/index';

/**
 * "Translate from <locale>" in the editor's locale row.
 *
 * It sends one prompt into the *same* session the chat panel renders, marked
 * invisible so the instruction itself does not clutter the transcript, and
 * then does nothing else: the model answers by calling the transport's
 * document tool, which lands in the form through the `LlmDocumentBridge`.
 * There is no translation-specific transport, response parser or patch
 * applier here — the previous implementation had all three.
 *
 * Because the conversation is shared, a translation is a turn in it: the user
 * can follow up in the panel ("make that less formal") instead of starting
 * over.
 */

const TranslateButton = styled.button`
  ${buttons.button};
  ${buttons.medium};
  color: ${colors.controlLabel};
  background: ${colors.textFieldBorder};
  height: 100%;
  margin-top: 20px;
  margin-bottom: 20px;
  margin-right: 20px;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const ErrorLine = styled.div`
  align-self: center;
  margin-right: 20px;
  color: ${colors.errorText};
  font-size: 13px;
`;

/**
 * Asks for JSON Patch operations through the transport's document tool rather
 * than for prose, so the reply lands as field edits instead of text a human
 * has to copy. Exported for tests and for hosts building their own action.
 */
export function buildTranslatePrompt({
  sourceLocale,
  targetLocale,
  fields,
}: {
  sourceLocale: string,
  targetLocale: string,
  fields: LlmTranslatableField[],
}): string {
  const fieldList = fields
    .map(field => `- "${field.name}": ${JSON.stringify(field.value)}`)
    .join('\n');

  return [
    `Translate the following field values from locale "${sourceLocale}" to locale "${targetLocale}".`,
    `Preserve markdown/formatting structure exactly and only translate human-readable text (do not translate code, URLs, slugs, or shortcodes).`,
    `For every field below, call the updateDocument tool with one JSON Patch operation per field: use "add" if the field does not already exist in the target document, otherwise "replace". The path is "/" followed by the exact field name.`,
    `Do not add, remove, or rename fields. Do not translate fields that are not listed below.`,
    ``,
    `Fields to translate:`,
    fieldList,
  ].join('\n');
}

export type AiTranslateActionProps = CmsLocaleActionRenderProps;

function AiTranslateAction({
  sourceLocale,
  targetLocale,
  getTranslatableFields,
  t,
}: AiTranslateActionProps) {
  const transport = useLlmTransport();
  const sessionContext = useLlmSession();
  const session = sessionContext?.session;
  useLlmSessionUpdates(session);

  const [error, setError] = useState<string | undefined>(undefined);
  const [isTranslating, setIsTranslating] = useState(false);

  // Translating a locale into itself is a no-op, and with no transport there
  // is nothing to translate with.
  if (!transport || sourceLocale === targetLocale) {
    return null;
  }

  async function handleClick() {
    const fields = getTranslatableFields(sourceLocale, targetLocale);
    if (fields.length === 0) return;

    const confirmed = await confirmDialog(
      t('editor.editorControlPane.i18n.translateFromDefaultConfirm', {
        locale: targetLocale.toUpperCase(),
      }),
      { title: t('editor.editorControlPane.i18n.translateFromDefaultConfirmTitle') },
    );
    if (!confirmed) return;

    const active = sessionContext?.ensureSession();
    if (!active) return;

    setError(undefined);
    setIsTranslating(true);
    try {
      await active.sendPrompt(
        buildTranslatePrompt({ sourceLocale, targetLocale, fields }),
        { visible: false },
      );
    } catch (caught) {
      setError(
        t('editor.editorControlPane.i18n.translateFailed', {
          error: caught instanceof Error ? caught.message : String(caught),
        }),
      );
    } finally {
      setIsTranslating(false);
    }
  }

  const busy = isTranslating || session?.status === 'streaming';

  return (
    <>
      <TranslateButton type="button" onClick={handleClick} disabled={busy}>
        {busy
          ? t('editor.editorControlPane.i18n.translatingFromDefault')
          : t('editor.editorControlPane.i18n.translateFromDefault', {
            locale: sourceLocale.toUpperCase(),
          })}
      </TranslateButton>
      {error && <ErrorLine role="alert">{error}</ErrorLine>}
    </>
  );
}

export default AiTranslateAction;

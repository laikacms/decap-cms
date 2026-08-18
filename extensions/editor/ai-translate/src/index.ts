/**
 * One-click AI translation of entry content (DCMS-1395).
 *
 * Registers a locale action into the editor's locale row. The action drives
 * the CMS's AI adapter (`decapAi()`, `POST {apiBasePath}/chat`) through the
 * same `updateDocument` tool round-trip the chat widget uses, so it inherits
 * whatever provider the consumer configured. No provider mechanism of its own.
 *
 * Importing this module registers nothing; call `registerAiTranslate()`.
 */
import { Registry } from '@laikacms/decap-cms/core';
import React from 'react';

import translatePhrases from './i18n/index';
import { TranslateAction } from './TranslateAction';

import type { CmsLocaleActionRenderProps } from '@laikacms/decap-cms/lib/util';

export interface RegisterAiTranslateOptions {
  /**
   * Base path the AI adapter is mounted at. Defaults to `/api/ai`, matching
   * `decapAi()`'s default.
   */
  apiBasePath?: string | undefined;
  /** Injectable fetch, mainly for tests. */
  fetch?: typeof fetch | undefined;
  /**
   * Register the bundled translations for the action's own strings. Pass
   * `false` if you supply them yourself via `CMS.registerLocale`.
   */
  registerPhrases?: boolean | undefined;
}

export const AI_TRANSLATE_ACTION_NAME = 'ai-translate';

let registered = false;
let deprecationWarned = false;

function warnDeprecated() {
  if (deprecationWarned || typeof console === 'undefined') return;
  deprecationWarned = true;
  console.warn(
    '[decap-cms] The standalone `@laikacms/decap-cms-ai-translate` package is deprecated. '
      + 'Use the built-in `AiTranslateAction` locale-row action shipped with the CMS core '
      + '(src/core/components/Editor/EditorControlPane/AiTranslateAction.tsx) instead. '
      + 'See extensions/editor/ai-translate/README.md.',
  );
}

/**
 * Idempotent: safe to call from multiple entry points. Follows the
 * `registerGitHubGraphQL` precedent for opt-in registration.
 *
 * @deprecated The standalone `@laikacms/decap-cms-ai-translate` package is deprecated in favor
 * of the built-in `AiTranslateAction` locale-row action shipped with the CMS core
 * (`src/core/components/Editor/EditorControlPane/AiTranslateAction.tsx`). See
 * `extensions/editor/ai-translate/README.md`.
 */
export function registerAiTranslate(options: RegisterAiTranslateOptions = {}) {
  warnDeprecated();
  if (registered) return;
  registered = true;

  if (options.registerPhrases !== false) {
    Object.entries(translatePhrases).forEach(([locale, phrases]) => {
      Registry.registerLocale(locale, phrases as Parameters<typeof Registry.registerLocale>[1]);
    });
  }

  Registry.registerLocaleAction({
    name: AI_TRANSLATE_ACTION_NAME,
    // Translating a locale into itself is a no-op, so the action hides while
    // the default locale is selected.
    isAvailable: ({ sourceLocale, targetLocale }) => sourceLocale !== targetLocale,
    render: (props: CmsLocaleActionRenderProps) =>
      React.createElement(TranslateAction, {
        ...props,
        apiBasePath: options.apiBasePath,
        fetch: options.fetch,
      }),
  });
}

export { buildTranslatePrompt, extractTranslatedFields } from './aiTranslate';
export type { TranslatableFieldValue } from './aiTranslate';
export { TranslateAction } from './TranslateAction';
export { useAiTranslate } from './useAiTranslate';
export type { TranslateParams, UseAiTranslateOptions, UseAiTranslateResult } from './useAiTranslate';

export default registerAiTranslate;

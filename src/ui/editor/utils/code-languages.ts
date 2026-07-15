import { CODE_LANGUAGE_FRIENDLY_NAME_MAP, CODE_LANGUAGE_MAP } from '@lexical/code-prism';

export const CODE_LANGUAGE_OPTIONS = Object.entries(CODE_LANGUAGE_FRIENDLY_NAME_MAP);

export function normalizeCodeLanguage(language: string): string {
  return CODE_LANGUAGE_MAP[language as keyof typeof CODE_LANGUAGE_MAP] ?? language;
}

export function getCodeLanguageLabel(language: string): string | undefined {
  const normalized = normalizeCodeLanguage(language);
  return CODE_LANGUAGE_FRIENDLY_NAME_MAP[
    normalized as keyof typeof CODE_LANGUAGE_FRIENDLY_NAME_MAP
  ];
}

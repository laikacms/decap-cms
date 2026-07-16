import { describe, expect, it } from 'vitest';

import { CODE_LANGUAGE_OPTIONS, getCodeLanguageLabel, normalizeCodeLanguage } from './code-languages';

describe('editor code languages', () => {
  it('uses the Prism language aliases already used by the highlighter', () => {
    expect(normalizeCodeLanguage('javascript')).toBe('js');
    expect(normalizeCodeLanguage('js')).toBe('js');
    expect(getCodeLanguageLabel('javascript')).toBe('JavaScript');
  });

  it('offers friendly labels for the language selector', () => {
    expect(CODE_LANGUAGE_OPTIONS).toContainEqual(['typescript', 'TypeScript']);
    expect(CODE_LANGUAGE_OPTIONS).toContainEqual(['plain', 'Plain Text']);
  });
});

import { describe, expect, it } from 'vitest';

import { buildTranslatePrompt, extractTranslatedFields } from '../aiTranslate';

describe('buildTranslatePrompt', () => {
  it('includes source/target locales and every field with its value', () => {
    const prompt = buildTranslatePrompt({
      sourceLocale: 'en',
      targetLocale: 'fr',
      fields: [
        { name: 'title', value: 'Hello world' },
        { name: 'count', value: 3 },
      ],
    });

    expect(prompt).toContain('from locale "en" to locale "fr"');
    expect(prompt).toContain('- "title": "Hello world"');
    expect(prompt).toContain('- "count": 3');
    expect(prompt).toContain('updateDocument');
  });

  it('produces a stable, non-empty prompt for an empty field list', () => {
    const prompt = buildTranslatePrompt({ sourceLocale: 'en', targetLocale: 'de', fields: [] });
    expect(prompt).toContain('from locale "en" to locale "de"');
  });
});

describe('extractTranslatedFields', () => {
  const knownFieldNames = ['title', 'body'];

  it('extracts add/replace operations whose path matches a known top-level field', () => {
    const results = extractTranslatedFields(
      [
        { op: 'replace', path: '/title', value: 'Bonjour' },
        { op: 'add', path: '/body', value: 'Contenu traduit' },
      ],
      knownFieldNames,
    );

    expect(results).toEqual([
      { name: 'title', value: 'Bonjour' },
      { name: 'body', value: 'Contenu traduit' },
    ]);
  });

  it('ignores operations for unknown fields', () => {
    const results = extractTranslatedFields(
      [{ op: 'replace', path: '/notAField', value: 'x' }],
      knownFieldNames,
    );
    expect(results).toEqual([]);
  });

  it('ignores non add/replace ops and nested paths', () => {
    const results = extractTranslatedFields(
      [
        { op: 'remove', path: '/title' },
        { op: 'replace', path: '/title/nested', value: 'x' },
      ],
      knownFieldNames,
    );
    expect(results).toEqual([]);
  });
});

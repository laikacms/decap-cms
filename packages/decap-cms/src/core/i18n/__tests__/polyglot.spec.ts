import { describe, expect, it, vi } from 'vitest';

import { createTranslator, flattenPhrases, transformPhrase } from '@/core/i18n/polyglot';

describe('transformPhrase', () => {
  it('interpolates %{token} placeholders', () => {
    expect(transformPhrase('Hello, %{name}!', { name: 'Spike' })).toBe('Hello, Spike!');
  });

  it('leaves unmatched and null tokens in place', () => {
    expect(transformPhrase('Hello, %{name}!', { other: 'x' })).toBe('Hello, %{name}!');
    expect(transformPhrase('Hello, %{name}!', { name: null })).toBe('Hello, %{name}!');
  });

  it('returns the phrase untouched without substitutions', () => {
    expect(transformPhrase('a |||| b')).toBe('a |||| b');
  });

  it('selects english plural forms via smart_count', () => {
    const phrase = '%{smart_count} entry |||| %{smart_count} entries';
    expect(transformPhrase(phrase, { smart_count: 1 }, 'en')).toBe('1 entry');
    expect(transformPhrase(phrase, { smart_count: 2 }, 'en')).toBe('2 entries');
    expect(transformPhrase(phrase, { smart_count: 0 }, 'en')).toBe('0 entries');
  });

  it('accepts a number as smart_count shortcut', () => {
    const phrase = '%{smart_count} entry |||| %{smart_count} entries';
    expect(transformPhrase(phrase, 1, 'en')).toBe('1 entry');
    expect(transformPhrase(phrase, 3, 'en')).toBe('3 entries');
  });

  it('selects russian three-form plurals', () => {
    const phrase = '%{smart_count} запись |||| %{smart_count} записи |||| %{smart_count} записей';
    expect(transformPhrase(phrase, { smart_count: 1 }, 'ru')).toBe('1 запись');
    expect(transformPhrase(phrase, { smart_count: 3 }, 'ru')).toBe('3 записи');
    expect(transformPhrase(phrase, { smart_count: 5 }, 'ru')).toBe('5 записей');
    expect(transformPhrase(phrase, { smart_count: 11 }, 'ru')).toBe('11 записей');
    expect(transformPhrase(phrase, { smart_count: 21 }, 'ru')).toBe('21 запись');
  });

  it('selects czech three-form plurals', () => {
    const phrase = 'a |||| b |||| c';
    expect(transformPhrase(phrase, { smart_count: 1 }, 'cs')).toBe('a');
    expect(transformPhrase(phrase, { smart_count: 2 }, 'cs')).toBe('b');
    expect(transformPhrase(phrase, { smart_count: 5 }, 'cs')).toBe('c');
  });

  it('selects arabic six-form plurals', () => {
    const phrase = 'zero |||| one |||| two |||| few |||| many |||| other';
    expect(transformPhrase(phrase, { smart_count: 0 }, 'ar')).toBe('zero');
    expect(transformPhrase(phrase, { smart_count: 1 }, 'ar')).toBe('one');
    expect(transformPhrase(phrase, { smart_count: 2 }, 'ar')).toBe('two');
    expect(transformPhrase(phrase, { smart_count: 5 }, 'ar')).toBe('few');
    expect(transformPhrase(phrase, { smart_count: 11 }, 'ar')).toBe('many');
    expect(transformPhrase(phrase, { smart_count: 100 }, 'ar')).toBe('other');
  });

  it('falls back to the english rule for unknown locales', () => {
    const phrase = 'one |||| many';
    expect(transformPhrase(phrase, { smart_count: 1 }, 'xx')).toBe('one');
    expect(transformPhrase(phrase, { smart_count: 2 }, 'xx')).toBe('many');
  });

  it('falls back to the first form when the phrase has fewer forms than the rule selects', () => {
    expect(transformPhrase('only', { smart_count: 5 }, 'ru')).toBe('only');
  });
});

describe('flattenPhrases', () => {
  it('flattens nested phrase objects into dot keys', () => {
    expect(
      flattenPhrases({
        nav: { hello: 'Hello', sidebar: { welcome: 'Welcome' } },
        top: 'Top',
      }),
    ).toEqual({
      'nav.hello': 'Hello',
      'nav.sidebar.welcome': 'Welcome',
      top: 'Top',
    });
  });
});

describe('createTranslator', () => {
  const t = createTranslator('en', {
    editor: {
      greeting: 'Hello, %{name}!',
      entries: '%{smart_count} entry |||| %{smart_count} entries',
    },
  });

  it('translates nested keys with interpolation', () => {
    expect(t('editor.greeting', { name: 'Spike' })).toBe('Hello, Spike!');
  });

  it('pluralizes with smart_count', () => {
    expect(t('editor.entries', { smart_count: 1 })).toBe('1 entry');
    expect(t('editor.entries', { smart_count: 4 })).toBe('4 entries');
  });

  it('warns and returns the key when missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(t('does.not.exist')).toBe('does.not.exist');
    expect(warn).toHaveBeenCalledWith('Missing translation for key: "does.not.exist"');
    warn.mockRestore();
  });

  it('uses the _ option as a default for missing keys', () => {
    expect(t('does.not.exist', { _: 'Default %{name}', name: 'value' })).toBe('Default value');
  });
});

import { describe, expect, it } from 'vitest';

import { checkForAtSignMentions, getPossibleQueryMatch } from '@/ui/editor/plugins/MentionsPlugin';

describe('getPossibleQueryMatch', () => {
  it('returns null when there is no @', () => {
    expect(getPossibleQueryMatch('hello world')).toBeNull();
    expect(getPossibleQueryMatch('')).toBeNull();
  });

  it('returns null for a bare @ (below the minimum length of 1)', () => {
    expect(getPossibleQueryMatch('@')).toBeNull();
    expect(getPossibleQueryMatch('hello @')).toBeNull();
  });

  it('matches @a with matchingString and replaceableString', () => {
    expect(getPossibleQueryMatch('@a')).toEqual({
      leadOffset: 0,
      matchingString: 'a',
      replaceableString: '@a',
    });
  });

  it('shifts leadOffset by the leading whitespace', () => {
    expect(getPossibleQueryMatch('hi @al')).toEqual({
      leadOffset: 3,
      matchingString: 'al',
      replaceableString: '@al',
    });
  });

  it('accepts an opening parenthesis as the leading character', () => {
    expect(getPossibleQueryMatch('see (@al')).toEqual({
      leadOffset: 5,
      matchingString: 'al',
      replaceableString: '@al',
    });
  });

  it('does not match an @ glued to a preceding word (e.g. an email address)', () => {
    expect(getPossibleQueryMatch('user@example')).toBeNull();
  });

  it('returns null when the query is followed by trailing punctuation only', () => {
    expect(getPossibleQueryMatch('@!')).toBeNull();
    expect(getPossibleQueryMatch('@ ')).toBeNull();
  });

  it('matches multi-word names containing spaces', () => {
    expect(getPossibleQueryMatch('cc @Josh Duck')).toEqual({
      leadOffset: 3,
      matchingString: 'Josh Duck',
      replaceableString: '@Josh Duck',
    });
  });
});

describe('checkForAtSignMentions', () => {
  it('rejects queries shorter than minMatchLength', () => {
    expect(checkForAtSignMentions('@ab', 3)).toBeNull();
    expect(checkForAtSignMentions('@abc', 3)).toEqual({
      leadOffset: 0,
      matchingString: 'abc',
      replaceableString: '@abc',
    });
  });

  it('accepts an empty query when minMatchLength is 0', () => {
    expect(checkForAtSignMentions('hi @', 0)).toEqual({
      leadOffset: 3,
      matchingString: '',
      replaceableString: '@',
    });
  });

  it('matches a query of exactly the alias length limit (50 chars)', () => {
    const query = 'a'.repeat(50);
    expect(checkForAtSignMentions(`@${query}`, 1)).toEqual({
      leadOffset: 0,
      matchingString: query,
      replaceableString: `@${query}`,
    });
  });

  it('matches a query of exactly the length limit (75 chars)', () => {
    const query = 'a'.repeat(75);
    expect(checkForAtSignMentions(`@${query}`, 1)?.matchingString).toBe(query);
  });

  it('returns null for over-length input', () => {
    expect(checkForAtSignMentions(`@${'a'.repeat(76)}`, 1)).toBeNull();
    expect(checkForAtSignMentions(`@${'a b '.repeat(40)}`, 1)).toBeNull();
  });
});

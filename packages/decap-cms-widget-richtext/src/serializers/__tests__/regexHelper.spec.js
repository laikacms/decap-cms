import { joinPatternSegments, combinePatterns, replaceWhen } from '../regexHelper';

describe('joinPatternSegments', () => {
  it('joins the `source` of multiple regular expressions into a single string', () => {
    const patterns = [/foo/, /bar/, /baz/];
    expect(joinPatternSegments(patterns)).toBe('foobarbaz');
  });

  it('preserves special characters from each pattern source', () => {
    const patterns = [/<(?!pre)[\w]+/, / *\w+="[^"]*"/];
    expect(joinPatternSegments(patterns)).toBe('<(?!pre)[\\w]+ *\\w+="[^"]*"');
  });

  it('does not mutate the received array', () => {
    const patterns = [/foo/, /bar/];
    const copy = [...patterns];
    joinPatternSegments(patterns);
    expect(patterns).toEqual(copy);
    expect(patterns[0]).toBe(copy[0]);
    expect(patterns[1]).toBe(copy[1]);
  });
});

describe('combinePatterns', () => {
  it('wraps each pattern source in a non-capturing group joined by alternation', () => {
    const patterns = [/foo/, /bar/, /baz/];
    expect(combinePatterns(patterns)).toBe('(?:foo)|(?:bar)|(?:baz)');
  });

  it('works with a single pattern', () => {
    expect(combinePatterns([/foo/])).toBe('(?:foo)');
  });

  it('does not mutate the received array', () => {
    const patterns = [/foo/, /bar/];
    const copy = [...patterns];
    combinePatterns(patterns);
    expect(patterns).toEqual(copy);
  });
});

describe('replaceWhen', () => {
  function upperCase(str) {
    return str.toUpperCase();
  }

  it('replaces matching substrings using the replacement function', () => {
    const result = replaceWhen(/bar/g, upperCase, 'foo bar baz', false);
    expect(result).toBe('foo BAR baz');
  });

  it('replaces non-matching substrings when invertMatchPattern is true', () => {
    const result = replaceWhen(/bar/g, upperCase, 'foo bar baz', true);
    expect(result).toBe('FOO bar BAZ');
  });

  it('applies replaceFn to the entire string when the pattern has no matches', () => {
    const result = replaceWhen(/xyz/g, upperCase, 'foo bar baz', false);
    expect(result).toBe('FOO BAR BAZ');
  });

  it('applies replaceFn to the entire string when there are no matches, regardless of invertMatchPattern', () => {
    const result = replaceWhen(/xyz/g, upperCase, 'foo bar baz', true);
    expect(result).toBe('FOO BAR BAZ');
  });

  it('handles a pattern that matches at the very start of the string', () => {
    const result = replaceWhen(/foo/g, upperCase, 'foo bar baz', false);
    expect(result).toBe('FOO bar baz');
  });

  it('handles trailing unmatched text after the last match', () => {
    const result = replaceWhen(/foo/g, upperCase, 'foo bar baz', false);
    expect(result).toBe('FOO bar baz');
  });

  it('handles multiple matches with unmatched text before, between, and after', () => {
    const result = replaceWhen(/ba./g, upperCase, 'xx bar yy baz zz', false);
    expect(result).toBe('xx BAR yy BAZ zz');
  });

  it('returns an empty string when given an empty string with no matches', () => {
    const result = replaceWhen(/foo/g, upperCase, '', false);
    expect(result).toBe('');
  });
});

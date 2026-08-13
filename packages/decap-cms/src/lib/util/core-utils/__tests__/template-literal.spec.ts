import { describe, expect, it } from 'vitest';

import { oneLine, oneLineTrim, stripIndent, url } from '@/lib/util/core-utils/template-literal.js';

describe('oneLine', () => {
  it('should collapse newlines and surrounding whitespace into a single space', () => {
    const result = oneLine`
      foo
      bar
      baz
    `;

    expect(result).toBe('foo bar baz');
  });

  it('should leave single-line input untouched', () => {
    expect(oneLine`hello world`).toBe('hello world');
  });

  it('should interpolate values in place', () => {
    const name = 'World';
    const result = oneLine`
      Hello
      ${name}!
    `;

    expect(result).toBe('Hello World!');
  });
});

describe('oneLineTrim', () => {
  it('should remove newlines and following whitespace without inserting a space', () => {
    const result = oneLineTrim`
      foo
      bar
    `;

    expect(result).toBe('foobar');
  });

  it('should interpolate values with no added whitespace', () => {
    const a = 'foo';
    const b = 'bar';
    const result = oneLineTrim`
      ${a}
      ${b}
    `;

    expect(result).toBe('foobar');
  });

  it('should leave single-line input untouched', () => {
    expect(oneLineTrim`hello world`).toBe('hello world');
  });
});

describe('stripIndent', () => {
  it('should remove the common leading indentation from every line', () => {
    const result = stripIndent`
      line one
        line two
      line three
    `;

    expect(result).toBe('line one\n  line two\nline three');
  });

  it('should leave unindented multi-line input untouched other than trimming', () => {
    const result = stripIndent`
line one
line two
    `;

    expect(result).toBe('line one\nline two');
  });

  it('should interpolate values before dedenting', () => {
    const value = 'INSERTED';
    const result = stripIndent`
      before ${value} after
        nested line
    `;

    expect(result).toBe('before INSERTED after\n  nested line');
  });
});

describe('url', () => {
  it('should join relative segments with a leading slash', () => {
    const id = 'baz';
    const result = url`bar/foo/${id}`;

    expect(result).toBe('/bar/foo/baz');
  });

  it('should treat an absolute base as the anchor and append the rest', () => {
    const base = 'https://example.com/api';
    const id = 'baz';
    const result = url`${base}/foo/${id}`;

    expect(result).toBe('https://example.com/api/foo/baz');
  });

  it('should reset to a later absolute URL that appears mid-template', () => {
    const first = 'foo';
    const second = 'https://example.com/bar';
    const result = url`${first}/${second}/baz`;

    expect(result).toBe('https://example.com/bar/baz');
  });

  it('should return an empty string for an entirely empty template', () => {
    expect(url``).toBe('');
  });
});

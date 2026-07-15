import { describe, expect, it } from 'vitest';

import { oneLine, oneLineTrim, stripIndent } from '@/lib/util/core-utils/template-literal.js';

describe('oneLine', () => {
  it('should collapse newlines and indentation into single spaces', () => {
    const result = oneLine`
      Widget 'foo' is not registered.
      Please make sure the widget is registered before use.
    `;
    expect(result).toEqual(
      "Widget 'foo' is not registered. Please make sure the widget is registered before use.",
    );
  });

  it('should interpolate values', () => {
    const name = 'title';
    expect(oneLine`
      Field ${name} is
      missing.
    `).toEqual('Field title is missing.');
  });

  it('should preserve spacing within a line', () => {
    expect(oneLine`
      a  b
      c
    `).toEqual('a  b c');
  });
});

describe('oneLineTrim', () => {
  it('should join lines without inserting spaces', () => {
    const result = oneLineTrim`https://example.com/issues/new?
      title=foo&
      body=bar`;
    expect(result).toEqual('https://example.com/issues/new?title=foo&body=bar');
  });
});

describe('stripIndent', () => {
  it('should remove the common leading indentation and trim the result', () => {
    const result = stripIndent`
      ---
      title: foo
      ---
      Content
    `;
    expect(result).toEqual('---\ntitle: foo\n---\nContent');
  });

  it('should keep relative indentation of deeper lines', () => {
    const result = stripIndent`
      collections:
        - name: posts
    `;
    expect(result).toEqual('collections:\n  - name: posts');
  });

  it('should interpolate values', () => {
    const branch = 'main';
    expect(stripIndent`
      Branch ${branch} not found.
    `).toEqual('Branch main not found.');
  });
});

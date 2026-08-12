import { describe, expect, it } from 'vitest';

import { tweetBlock } from '@/widgets/richtext/blocks/tweet';
import { youtubeBlock } from '@/widgets/richtext/blocks/youtube';

describe('youtubeBlock.formats.markdown', () => {
  const { pattern, fromMatch, serialize } = youtubeBlock.formats.markdown!;

  it('pattern matches the canonical hugo shortcode', () => {
    const match = pattern.exec('{{< youtube abc123 >}}');
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('abc123');
  });

  it('pattern matches without surrounding spaces inside the braces', () => {
    const match = pattern.exec('{{<youtube abc123>}}');
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('abc123');
  });

  it('pattern does not match an unrelated shortcode', () => {
    expect(pattern.exec('{{< vimeo abc123 >}}')).toBeNull();
  });

  it('pattern does not match without a video id', () => {
    expect(pattern.exec('{{< youtube >}}')).toBeNull();
  });

  it('fromMatch extracts the id into block data', () => {
    const match = pattern.exec('{{< youtube dQw4w9WgXcQ >}}');
    expect(match).not.toBeNull();
    expect(fromMatch(match!)).toEqual({ id: 'dQw4w9WgXcQ' });
  });

  it('fromMatch defaults to an empty id when the capture group is missing', () => {
    // Simulate a degenerate match array without the capture group populated.
    const degenerateMatch = [''] as unknown as RegExpExecArray;
    expect(fromMatch(degenerateMatch)).toEqual({ id: '' });
  });

  it('serialize renders the canonical hugo shortcode', () => {
    expect(serialize({ id: 'abc123' })).toBe('{{< youtube abc123 >}}');
  });

  it('round-trips match -> fromMatch -> serialize back to the canonical shortcode', () => {
    const source = '{{< youtube dQw4w9WgXcQ >}}';
    const match = pattern.exec(source);
    expect(match).not.toBeNull();
    const data = fromMatch(match!);
    expect(serialize(data)).toBe(source);
  });
});

describe('tweetBlock.formats.markdown', () => {
  const { pattern, fromMatch, serialize } = tweetBlock.formats.markdown!;

  it('pattern matches the canonical hugo shortcode with a numeric id', () => {
    const match = pattern.exec('{{< tweet 1234567890 >}}');
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('1234567890');
  });

  it('pattern matches without surrounding spaces inside the braces', () => {
    const match = pattern.exec('{{<tweet 20>}}');
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('20');
  });

  it('pattern does not match a non-numeric id', () => {
    expect(pattern.exec('{{< tweet not-a-number >}}')).toBeNull();
  });

  it('pattern does not match an unrelated shortcode', () => {
    expect(pattern.exec('{{< youtube 1234567890 >}}')).toBeNull();
  });

  it('fromMatch extracts the id into block data', () => {
    const match = pattern.exec('{{< tweet 20 >}}');
    expect(match).not.toBeNull();
    expect(fromMatch(match!)).toEqual({ id: '20' });
  });

  it('fromMatch defaults to an empty id when the capture group is missing', () => {
    const degenerateMatch = [''] as unknown as RegExpExecArray;
    expect(fromMatch(degenerateMatch)).toEqual({ id: '' });
  });

  it('serialize renders the canonical hugo shortcode', () => {
    expect(serialize({ id: '20' })).toBe('{{< tweet 20 >}}');
  });

  it('round-trips match -> fromMatch -> serialize back to the canonical shortcode', () => {
    const source = '{{< tweet 1234567890 >}}';
    const match = pattern.exec(source);
    expect(match).not.toBeNull();
    const data = fromMatch(match!);
    expect(serialize(data)).toBe(source);
  });
});

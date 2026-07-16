import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { markdownFormat } from '@/format-packs/markdown';
import {
  getMapper,
  registerBlock,
  registerFormat,
  unregisterBlock,
  unregisterFormat,
} from '@/lib/richtext';
import { tweetBlock } from '@/widgets/richtext/blocks/tweet';
import { youtubeBlock } from '@/widgets/richtext/blocks/youtube';

beforeEach(() => {
  registerFormat(markdownFormat);
  registerBlock(youtubeBlock);
  registerBlock(tweetBlock);
});

afterEach(() => {
  unregisterBlock('youtube');
  unregisterBlock('tweet');
  unregisterFormat('markdown');
});

describe('bundled embed blocks', () => {
  it('parses hugo shortcodes into typed PT blocks', () => {
    const mapper = getMapper('markdown');
    const doc = mapper.toPortableText(
      'Intro.\n\n{{< youtube abc123 >}}\n\n{{< tweet 20 >}}\n\nOutro.\n',
    );

    expect(doc.map(node => node._type)).toEqual(['block', 'youtube', 'tweet', 'block']);
    expect((doc[1] as Record<string, unknown>).id).toBe('abc123');
    expect((doc[2] as Record<string, unknown>).id).toBe('20');
  });

  it('serializes typed PT blocks back to shortcodes and round-trips', () => {
    const mapper = getMapper('markdown');
    const source = 'Intro.\n\n{{< youtube abc123 >}}\n\n{{< tweet 20 >}}\n\nOutro.\n';
    const doc = mapper.toPortableText(source);
    const markdown = mapper.fromPortableText(doc);

    expect(markdown).toContain('{{< youtube abc123 >}}');
    expect(markdown).toContain('{{< tweet 20 >}}');
    expect(markdown).not.toContain('```json');
    expect(mapper.toPortableText(markdown)).toEqual(doc);
  });

  it('tweet pattern only matches numeric ids', () => {
    const mapper = getMapper('markdown');
    const doc = mapper.toPortableText('{{< tweet not-a-number >}}\n');
    expect(doc.map(node => node._type)).toEqual(['block']);
  });
});

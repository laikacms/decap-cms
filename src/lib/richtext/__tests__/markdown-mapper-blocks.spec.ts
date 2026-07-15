import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerBlock, unregisterBlock } from '@/lib/richtext/blocks/registry';
import { createMarkdownMapper, markdownMapper } from '@/lib/richtext/markdown-mapper';

import type { BlockDefinition, BlockFormatCodec } from '@/lib/richtext/blocks/types';

const youtubeCodec: BlockFormatCodec = {
  pattern: /^{{<\s?youtube (\S+)\s?>}}/,
  fromMatch: match => ({ id: match[1] }),
  serialize: data => `{{< youtube ${String(data.id)} >}}`,
};

const containerCodec: BlockFormatCodec = {
  pattern: /^{{<\s?container\s?>}}\n([\s\S]*?)\n{{<\s?\/container\s?>}}/,
  fromMatch: match => ({ body: match[1] }),
  serialize: data => `{{< container >}}\n${String(data.body)}\n{{< /container >}}`,
};

function withCodecs(codecs: Record<string, BlockFormatCodec>) {
  return createMarkdownMapper(() => new Map(Object.entries(codecs)));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('markdown mapper with block codecs', () => {
  it('behaves identically to the plain mapper when no codecs resolve', () => {
    const source = '# Title\n\nSome **bold** prose.\n';
    const plain = createMarkdownMapper();
    expect(withCodecs({}).toPortableText(source)).toEqual(plain.toPortableText(source));
  });

  it('parses a shortcode into a typed PT block between markdown segments', () => {
    const mapper = withCodecs({ youtube: youtubeCodec });
    const doc = mapper.toPortableText('# Title\n\n{{< youtube abc123 >}}\n\nAfter.\n');

    const types = doc.map(node => node._type);
    expect(types).toEqual(['block', 'youtube', 'block']);
    const youtube = doc[1] as Record<string, unknown>;
    expect(youtube.id).toBe('abc123');
    expect(typeof youtube._key).toBe('string');
  });

  it('anchors codec patterns to line starts', () => {
    const mapper = withCodecs({ youtube: youtubeCodec });
    const doc = mapper.toPortableText('inline {{< youtube abc >}} mention\n');
    expect(doc.map(node => node._type)).toEqual(['block']);
  });

  it('parses a multiline container block (s-flag style patterns)', () => {
    const mapper = withCodecs({ container: containerCodec });
    const source = 'Before.\n\n{{< container >}}\nInner **markdown**\n{{< /container >}}\n\nAfter.\n';
    const doc = mapper.toPortableText(source);

    expect(doc.map(node => node._type)).toEqual(['block', 'container', 'block']);
    expect((doc[1] as Record<string, unknown>).body).toBe('Inner **markdown**');
  });

  it('keeps parse deterministic across calls', () => {
    const mapper = withCodecs({ youtube: youtubeCodec });
    const source = 'One.\n\n{{< youtube a >}}\n\nTwo.\n';
    expect(mapper.toPortableText(source)).toEqual(mapper.toPortableText(source));
  });

  it('a codec cannot clobber _type or _key from fromMatch data', () => {
    const hostile: BlockFormatCodec = {
      pattern: /^!hostile!/,
      fromMatch: () => ({ _type: 'block', _key: 'stolen', ok: true }) as Record<string, unknown>,
      serialize: () => '!hostile!',
    };
    const doc = withCodecs({ hostile }).toPortableText('!hostile!\n');
    const node = doc[0] as Record<string, unknown>;
    expect(node._type).toBe('hostile');
    expect(node._key).not.toBe('stolen');
    expect(node.ok).toBe(true);
  });

  it('serializes typed blocks through their codec', () => {
    const mapper = withCodecs({ youtube: youtubeCodec });
    const markdown = mapper.fromPortableText([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', _key: 'k1', text: 'Hello', marks: [] }],
      },
      { _type: 'youtube', _key: 'k2', id: 'abc123' },
    ]);
    expect(markdown).toContain('Hello');
    expect(markdown).toContain('{{< youtube abc123 >}}');
    expect(markdown).not.toContain('```json');
  });

  it('round-trips a shortcode block through parse -> serialize -> parse', () => {
    const mapper = withCodecs({ youtube: youtubeCodec });
    const source = 'Intro.\n\n{{< youtube abc123 >}}\n\nOutro.\n';
    const once = mapper.toPortableText(source);
    const twice = mapper.toPortableText(mapper.fromPortableText(once));
    expect(twice).toEqual(once);
  });

  it('warns and emits a JSON fence for a block type with no codec', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const markdown = withCodecs({}).fromPortableText([
      { _type: 'mystery', _key: 'k0', prop: 1 },
    ]);
    expect(markdown).toContain('```json');
    expect(markdown).toContain('"mystery"');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no markdown codec'));
  });

  it('the default markdownMapper picks up registry blocks with markdown codecs', () => {
    const definition: BlockDefinition = {
      id: 'youtube',
      fields: [{ name: 'id' }],
      formats: { markdown: youtubeCodec },
    };
    registerBlock(definition);
    try {
      const doc = markdownMapper.toPortableText('{{< youtube xyz >}}\n');
      expect(doc.map(node => node._type)).toEqual(['youtube']);
      expect(markdownMapper.fromPortableText(doc)).toContain('{{< youtube xyz >}}');
    } finally {
      unregisterBlock('youtube');
    }
  });

  it('caps detection when unambiguous MDX constructs are present', () => {
    const mapper = createMarkdownMapper();
    const markdownOnly = '# Title\n\n- a\n- b\n\n**bold** [x](y)\n\n```\ncode\n```\n';
    const mdxish = `${markdownOnly}\nimport {Chart} from './chart'\n\n<Chart height={1} />\n`;
    expect(mapper.detect(markdownOnly)).toBeGreaterThan(0.8);
    expect(mapper.detect(mdxish)).toBeLessThanOrEqual(0.8);
  });
});

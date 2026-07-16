import { describe, expect, it } from 'vitest';

import { resolveFormat } from '@/core/formats/formats';
import { createMarkdownEntryCodec } from '@/entry-codecs/markdown/index';

// Runs in its own module registry (vitest isolates test files), so no entry
// codecs are registered here: this is the `/bare` consumer scenario where a
// needed codec was forgotten.
describe('resolveFormat without registered entry codecs', () => {
  it('fails loudly instead of resolving nothing', () => {
    expect(() => resolveFormat({ name: 'posts', format: 'yaml' }, {})).toThrow(
      /registerEntryCodec/,
    );
    expect(() => resolveFormat({ name: 'posts' }, {})).toThrow(/entry-codecs\/markdown/);
  });
});

describe('markdown entry codec built without frontmatter languages', () => {
  const bare = createMarkdownEntryCodec();

  it('still parses body-only files', () => {
    expect(bare.formatter.fromFile('Content')).toEqual({ body: 'Content' });
    expect(bare.formatter.fromFile('')).toEqual({});
  });

  it('still writes body-only files', () => {
    expect(bare.formatter.toFile({ body: 'Content' })).toEqual('Content');
  });

  it('fails loudly instead of eating a fence whose language is missing', () => {
    expect(() => bare.formatter.fromFile('---\ntitle: YAML\n---\nContent')).toThrow(
      /yamlFrontmatterCodec/,
    );
    expect(() => bare.formatter.fromFile('+++\ntitle = "TOML"\n+++\nContent')).toThrow(
      /tomlFrontmatterCodec/,
    );
  });

  it('fails loudly when writing metadata with no language available', () => {
    expect(() => bare.formatter.toFile({ title: 'x', body: 'Content' })).toThrow(
      /yamlFrontmatterCodec/,
    );
  });

  it('degrades a fixed-language formatter to infer, which refuses the fence', () => {
    const formatter = bare.getFormatter!('yaml-frontmatter');
    expect(() => formatter.fromFile('---\ntitle: YAML\n---\nContent')).toThrow(/yamlFrontmatterCodec/);
  });
});

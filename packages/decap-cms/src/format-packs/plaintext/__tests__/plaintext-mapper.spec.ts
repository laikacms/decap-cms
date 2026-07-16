import { describe, expect, it } from 'vitest';

import { plainTextMapper } from '@/format-packs/plaintext';

describe('plainTextMapper', () => {
  it('splits blank-line-separated paragraphs into normal-style blocks', () => {
    const text = 'First paragraph.\n\nSecond paragraph.';
    const doc = plainTextMapper.toPortableText(text);

    expect(doc).toHaveLength(2);
    expect(doc[0]).toMatchObject({ _type: 'block', style: 'normal' });
    expect((doc[0] as { children: { text: string }[] }).children[0].text).toBe('First paragraph.');
  });

  it('round-trips paragraphs byte-for-byte through PT', () => {
    const text = 'First paragraph.\n\nSecond paragraph with more words.';
    const doc = plainTextMapper.toPortableText(text);
    const out = plainTextMapper.fromPortableText(doc);
    expect(out).toBe(text);
  });

  it('drops surrounding blank lines and collapses extra blank-line runs', () => {
    const text = '\n\nFirst.\n\n\n\nSecond.\n\n';
    const doc = plainTextMapper.toPortableText(text);
    const out = plainTextMapper.fromPortableText(doc);
    expect(out).toBe('First.\n\nSecond.');
  });

  it('produces no marks or annotations', () => {
    const doc = plainTextMapper.toPortableText('Some text');
    const block = doc[0] as { children: { marks: string[] }[], markDefs: unknown[] };
    expect(block.children[0].marks).toEqual([]);
    expect(block.markDefs).toEqual([]);
  });

  describe('detect', () => {
    it('scores plain prose above zero', () => {
      expect(plainTextMapper.detect('Just some plain prose.')).toBeGreaterThan(0);
    });

    it('scores HTML at zero', () => {
      expect(plainTextMapper.detect('<p>tagged</p>')).toBe(0);
    });

    it('scores an empty string at zero', () => {
      expect(plainTextMapper.detect('')).toBe(0);
    });
  });
});

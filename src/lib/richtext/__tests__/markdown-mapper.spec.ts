import { describe, expect, it } from 'vitest';

import { markdownMapper } from '@/lib/richtext/markdown-mapper';

/**
 * Round-trip coverage for the custom block types `markdownToPortableText`
 * emits (`code`, `html`, `image`, `horizontal-rule`). The serializer does not
 * register renderers for these by default, so without explicit wiring each
 * one degrades into a ```json fence of its raw node on the way back out,
 * corrupting entries at persist time.
 */
describe('markdownMapper round-trips', () => {
  function roundTrip(markdown: string): string {
    return markdownMapper.fromPortableText(markdownMapper.toPortableText(markdown));
  }

  it('round-trips a fenced code block', () => {
    const out = roundTrip('```js\nconst x = 1;\n```');
    expect(out).toContain('```js');
    expect(out).toContain('const x = 1;');
    expect(out).not.toContain('```json');
  });

  it('round-trips an image', () => {
    const out = roundTrip('![alt text](/img/a.png)');
    expect(out).toContain('![alt text](/img/a.png)');
    expect(out).not.toContain('```json');
  });

  it('round-trips a horizontal rule', () => {
    const out = roundTrip('some text\n\n---\n\nmore text');
    expect(out).toContain('---');
    expect(out).not.toContain('```json');
  });

  it('round-trips raw HTML', () => {
    const out = roundTrip('<div class="x">raw</div>');
    expect(out).toContain('<div class="x">raw</div>');
    expect(out).not.toContain('```json');
  });

  it('serializes an image PT block produced by the editor bridge', () => {
    const out = markdownMapper.fromPortableText([
      { _type: 'image', _key: 'i1', src: '/img/b.png', alt: 'b' },
    ]);
    expect(out.trim()).toBe('![b](/img/b.png)');
  });

  it('serializes a horizontal-rule PT block produced by the editor bridge', () => {
    const out = markdownMapper.fromPortableText([{ _type: 'horizontal-rule', _key: 'h1' }]);
    expect(out.trim()).toBe('---');
  });
});

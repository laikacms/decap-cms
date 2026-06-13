import unified from 'unified';
import u from 'unist-builder';

import remarkImagesToText from '../remarkImagesToText';

function process(children) {
  const tree = u('root', children);
  const result = unified().use(remarkImagesToText).runSync(tree);
  return result.children;
}

describe('remarkImagesToText', () => {
  it('converts a sole-child image in a paragraph to a text node with raw markdown', () => {
    const children = [
      u('paragraph', [
        u('image', { url: 'http://example.com/img.jpg', alt: 'alt text', title: null }),
      ]),
    ];
    const result = process(children);
    expect(result).toEqual([
      u('paragraph', [u('text', '![alt text](http://example.com/img.jpg)')]),
    ]);
  });

  it('includes title in the raw markdown when present', () => {
    const children = [
      u('paragraph', [
        u('image', { url: 'http://example.com/img.jpg', alt: 'alt', title: 'My Title' }),
      ]),
    ];
    const result = process(children);
    expect(result).toEqual([
      u('paragraph', [u('text', '![alt](http://example.com/img.jpg "My Title")')]),
    ]);
  });

  it('handles missing alt with empty string', () => {
    const children = [
      u('paragraph', [u('image', { url: 'http://example.com/img.jpg', alt: null, title: null })]),
    ];
    const result = process(children);
    expect(result).toEqual([u('paragraph', [u('text', '![](http://example.com/img.jpg)')])]);
  });

  it('leaves images alongside other children as image nodes', () => {
    const imgNode = u('image', { url: 'http://example.com/img.jpg', alt: 'img', title: null });
    const textNode = u('text', 'some text');
    const children = [u('paragraph', [imgNode, textNode])];
    const result = process(children);
    expect(result).toEqual([u('paragraph', [imgNode, textNode])]);
  });

  it('passes through non-paragraph nodes unchanged', () => {
    const children = [
      u('heading', { depth: 1 }, [u('text', 'Hello')]),
      u('paragraph', [u('text', 'A paragraph with no image')]),
    ];
    const result = process(children);
    expect(result).toEqual(children);
  });

  it('does not convert image when paragraph has multiple children including image', () => {
    const imgNode = u('image', { url: 'http://example.com/img.jpg', alt: 'img', title: null });
    const children = [u('paragraph', [u('text', 'before '), imgNode])];
    const result = process(children);
    expect(result).toEqual(children);
  });
});

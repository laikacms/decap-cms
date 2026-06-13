import unified from 'unified';
import u from 'unist-builder';

import remarkSquashReferences from '../remarkSquashReferences';

function process(children) {
  const tree = u('root', children);
  const result = unified().use(remarkSquashReferences).runSync(tree);
  return result.children;
}

describe('remarkSquashReferences', () => {
  it('converts imageReference with matching definition to an image node with inlined url', () => {
    const children = [
      u('paragraph', [
        u('imageReference', { identifier: 'bravo', referenceType: 'full', alt: 'alpha' }, []),
      ]),
      u('definition', { identifier: 'bravo', url: 'http://example.com/img.jpg', title: null }),
    ];
    const result = process(children);
    expect(result).toEqual([
      u('paragraph', [
        u('image', { url: 'http://example.com/img.jpg', title: null, alt: 'alpha' }, []),
      ]),
    ]);
  });

  it('converts imageReference with matching definition including title', () => {
    const children = [
      u('paragraph', [
        u('imageReference', { identifier: 'ref', referenceType: 'full', alt: 'caption' }, []),
      ]),
      u('definition', { identifier: 'ref', url: 'http://example.com/img.jpg', title: 'My Image' }),
    ];
    const result = process(children);
    expect(result).toEqual([
      u('paragraph', [
        u('image', { url: 'http://example.com/img.jpg', title: 'My Image', alt: 'caption' }, []),
      ]),
    ]);
  });

  it('converts linkReference with matching definition to a link node with inlined url', () => {
    const children = [
      u('paragraph', [
        u('linkReference', { identifier: 'ref', referenceType: 'full' }, [u('text', 'click here')]),
      ]),
      u('definition', { identifier: 'ref', url: 'http://example.com', title: null }),
    ];
    const result = process(children);
    const link = result[0].children[0];
    expect(link.type).toEqual('link');
    expect(link.url).toEqual('http://example.com');
    expect(link.title).toBeNull();
    expect(link.children[0].type).toEqual('text');
    expect(link.children[0].value).toEqual('click here');
  });

  it('decomposes imageReference with no matching definition into bracketed text fragments', () => {
    const children = [
      u('paragraph', [
        u('imageReference', { identifier: 'missing', referenceType: 'full', alt: 'my alt' }, []),
      ]),
    ];
    const result = process(children);
    // Should produce: text "![", text "my alt" (from alt), text "]"
    expect(result[0].children[0]).toEqual(u('text', '!['));
    expect(result[0].children[result[0].children.length - 1]).toEqual(u('text', ']'));
  });

  it('decomposes linkReference with no matching definition into bracketed text fragments', () => {
    const children = [
      u('paragraph', [
        u('linkReference', { identifier: 'missing', referenceType: 'full' }, [
          u('text', 'link text'),
        ]),
      ]),
    ];
    const result = process(children);
    expect(result[0].children[0].type).toEqual('text');
    expect(result[0].children[0].value).toEqual('[');
    expect(result[0].children[1].type).toEqual('text');
    expect(result[0].children[1].value).toEqual('link text');
    expect(result[0].children[result[0].children.length - 1].type).toEqual('text');
    expect(result[0].children[result[0].children.length - 1].value).toEqual(']');
  });

  it('removes definition nodes from the output', () => {
    const children = [
      u('paragraph', [u('text', 'hello')]),
      u('definition', { identifier: 'ref', url: 'http://example.com', title: null }),
    ];
    const result = process(children);
    expect(result).toHaveLength(1);
    expect(result[0].type).toEqual('paragraph');
    expect(result[0].children[0].type).toEqual('text');
    expect(result[0].children[0].value).toEqual('hello');
  });

  it('removes multiple definition nodes and leaves other content intact', () => {
    const children = [
      u('paragraph', [u('text', 'intro')]),
      u('definition', { identifier: 'a', url: 'http://a.com', title: null }),
      u('definition', { identifier: 'b', url: 'http://b.com', title: null }),
      u('paragraph', [u('text', 'outro')]),
    ];
    const result = process(children);
    expect(result).toHaveLength(2);
    expect(result[0].type).toEqual('paragraph');
    expect(result[0].children[0].value).toEqual('intro');
    expect(result[1].type).toEqual('paragraph');
    expect(result[1].children[0].value).toEqual('outro');
  });
});

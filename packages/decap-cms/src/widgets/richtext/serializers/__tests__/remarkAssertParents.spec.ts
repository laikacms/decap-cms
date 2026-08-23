import u from 'unist-builder';
import { describe, expect, it } from 'vitest';

import remarkAssertParents from '@/widgets/richtext/serializers/remarkAssertParents';

import type { MdastNode, MdastRoot } from '@/widgets/richtext/types';

const transform = remarkAssertParents();

describe('remarkAssertParents', () => {
  it('should unnest invalidly nested blocks', () => {
    const input = u<MdastRoot>('root', [
      u<MdastNode>('paragraph', [
        u<MdastNode>('paragraph', [u<MdastNode>('text', 'Paragraph text.')]),
        u<MdastNode>('heading', { depth: 1 }, [u<MdastNode>('text', 'Heading text.')]),
        u<MdastNode>('code', 'someCode()'),
        u<MdastNode>('blockquote', [u<MdastNode>('text', 'Quote text.')]),
        u<MdastNode>('list', [u<MdastNode>('listItem', [u<MdastNode>('text', 'A list item.')])]),
        u<MdastNode>('table', [
          u<MdastNode>('tableRow', [
            u<MdastNode>('tableCell', [u<MdastNode>('text', 'Text in a table cell.')]),
          ]),
        ]),
        u<MdastNode>('thematicBreak'),
      ]),
    ]);

    const output = u<MdastRoot>('root', [
      u<MdastNode>('paragraph', [u<MdastNode>('text', 'Paragraph text.')]),
      u<MdastNode>('heading', { depth: 1 }, [u<MdastNode>('text', 'Heading text.')]),
      u<MdastNode>('code', 'someCode()'),
      u<MdastNode>('blockquote', [u<MdastNode>('text', 'Quote text.')]),
      u<MdastNode>('list', [u<MdastNode>('listItem', [u<MdastNode>('text', 'A list item.')])]),
      u<MdastNode>('table', [
        u<MdastNode>('tableRow', [
          u<MdastNode>('tableCell', [u<MdastNode>('text', 'Text in a table cell.')]),
        ]),
      ]),
      u<MdastNode>('thematicBreak'),
    ]);

    expect(transform(input)).toEqual(output);
  });

  it('should unnest deeply nested blocks', () => {
    const input = u<MdastRoot>('root', [
      u<MdastNode>('paragraph', [
        u<MdastNode>('paragraph', [
          u<MdastNode>('paragraph', [
            u<MdastNode>('paragraph', [u<MdastNode>('text', 'Paragraph text.')]),
            u<MdastNode>('heading', { depth: 1 }, [u<MdastNode>('text', 'Heading text.')]),
            u<MdastNode>('code', 'someCode()'),
            u<MdastNode>('blockquote', [
              u<MdastNode>('paragraph', [
                u<MdastNode>('strong', [
                  u<MdastNode>('heading', [u<MdastNode>('text', 'Quote text.')]),
                ]),
              ]),
            ]),
            u<MdastNode>('list', [
              u<MdastNode>('listItem', [u<MdastNode>('text', 'A list item.')]),
            ]),
            u<MdastNode>('table', [
              u<MdastNode>('tableRow', [
                u<MdastNode>('tableCell', [u<MdastNode>('text', 'Text in a table cell.')]),
              ]),
            ]),
            u<MdastNode>('thematicBreak'),
          ]),
        ]),
      ]),
    ]);

    const output = u<MdastRoot>('root', [
      u<MdastNode>('paragraph', [u<MdastNode>('text', 'Paragraph text.')]),
      u<MdastNode>('heading', { depth: 1 }, [u<MdastNode>('text', 'Heading text.')]),
      u<MdastNode>('code', 'someCode()'),
      u<MdastNode>('blockquote', [u<MdastNode>('heading', [u<MdastNode>('text', 'Quote text.')])]),
      u<MdastNode>('list', [u<MdastNode>('listItem', [u<MdastNode>('text', 'A list item.')])]),
      u<MdastNode>('table', [
        u<MdastNode>('tableRow', [
          u<MdastNode>('tableCell', [u<MdastNode>('text', 'Text in a table cell.')]),
        ]),
      ]),
      u<MdastNode>('thematicBreak'),
    ]);

    expect(transform(input)).toEqual(output);
  });

  it('should remove blocks that are emptied as a result of denesting', () => {
    const input = u<MdastRoot>('root', [
      u<MdastNode>('paragraph', [
        u<MdastNode>('heading', { depth: 1 }, [u<MdastNode>('text', 'Heading text.')]),
      ]),
    ]);

    const output = u<MdastRoot>('root', [
      u<MdastNode>('heading', { depth: 1 }, [u<MdastNode>('text', 'Heading text.')]),
    ]);

    expect(transform(input)).toEqual(output);
  });

  it('should handle asymmetrical splits', () => {
    const input = u<MdastRoot>('root', [
      u<MdastNode>('paragraph', [
        u<MdastNode>('heading', { depth: 1 }, [u<MdastNode>('text', 'Heading text.')]),
      ]),
    ]);

    const output = u<MdastRoot>('root', [
      u<MdastNode>('heading', { depth: 1 }, [u<MdastNode>('text', 'Heading text.')]),
    ]);

    expect(transform(input)).toEqual(output);
  });

  it('should nest invalidly nested blocks in the nearest valid ancestor', () => {
    const input = u<MdastRoot>('root', [
      u<MdastNode>('paragraph', [
        u<MdastNode>('blockquote', [
          u<MdastNode>('strong', [
            u<MdastNode>('heading', { depth: 1 }, [u<MdastNode>('text', 'Heading text.')]),
          ]),
        ]),
      ]),
    ]);

    const output = u<MdastRoot>('root', [
      u<MdastNode>('blockquote', [
        u<MdastNode>('heading', { depth: 1 }, [u<MdastNode>('text', 'Heading text.')]),
      ]),
    ]);

    expect(transform(input)).toEqual(output);
  });

  it('should preserve validly nested siblings of invalidly nested blocks', () => {
    const input = u<MdastRoot>('root', [
      u<MdastNode>('paragraph', [
        u<MdastNode>('blockquote', [
          u<MdastNode>('strong', [
            u<MdastNode>('text', 'Deep validly nested text a.'),
            u<MdastNode>('heading', { depth: 1 }, [u<MdastNode>('text', 'Heading text.')]),
            u<MdastNode>('text', 'Deep validly nested text b.'),
          ]),
        ]),
        u<MdastNode>('text', 'Validly nested text.'),
      ]),
    ]);

    const output = u<MdastRoot>('root', [
      u<MdastNode>('blockquote', [
        u<MdastNode>('strong', [u<MdastNode>('text', 'Deep validly nested text a.')]),
        u<MdastNode>('heading', { depth: 1 }, [u<MdastNode>('text', 'Heading text.')]),
        u<MdastNode>('strong', [u<MdastNode>('text', 'Deep validly nested text b.')]),
      ]),
      u<MdastNode>('paragraph', [u<MdastNode>('text', 'Validly nested text.')]),
    ]);

    expect(transform(input)).toEqual(output);
  });

  it('should allow intermediate parents like list and table to contain required block children', () => {
    function tree() {
      return u<MdastRoot>('root', [
        u<MdastNode>('blockquote', [
          u<MdastNode>('list', [
            u<MdastNode>('listItem', [
              u<MdastNode>('table', [
                u<MdastNode>('tableRow', [
                  u<MdastNode>('tableCell', [
                    u<MdastNode>('heading', { depth: 1 }, [
                      u<MdastNode>('text', 'Validly nested heading text.'),
                    ]),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]);
    }

    expect(transform(tree())).toEqual(tree());
  });
});

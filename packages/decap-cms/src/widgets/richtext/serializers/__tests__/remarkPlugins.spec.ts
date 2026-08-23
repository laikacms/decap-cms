import visit from 'unist-util-visit';
import { describe, expect, it } from 'vitest';

import { markdownToRemark, remarkToMarkdown } from '@/widgets/richtext/serializers/index';

import type { MdastNode, MdastRoot } from '@/widgets/richtext/types';
import type { Processor } from 'unified';

describe('registered remark plugins', () => {
  function withNetlifyLinks() {
    return function transformer(tree: MdastNode) {
      visit(tree, 'link', function onLink(node) {
        node.url = 'https://netlify.com';
      });
    };
  }

  it('should use remark transformer plugins when converting mdast to markdown', () => {
    const result = remarkToMarkdown(
      {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', value: 'Some ' },
              { type: 'emphasis', children: [{ type: 'text', value: 'important' }] },
              { type: 'text', value: ' text with ' },
              {
                type: 'link',
                title: null,
                url: 'https://this-value-should-be-replaced.com',
                children: [{ type: 'text', value: 'a link' }],
              },
              { type: 'text', value: ' in it.' },
            ],
          },
        ],
      },
      [withNetlifyLinks],
    );

    expect(result).toBe('Some *important* text with [a link](https://netlify.com) in it.');
  });

  it('should use remark transformer plugins when converting markdown to mdast', () => {
    const result = markdownToRemark(
      'Some text with [a link](https://this-value-should-be-replaced.com) in it.',
      [withNetlifyLinks],
    );

    const paragraph = result.children[0];
    const link = paragraph.children?.find(child => child.type === 'link');

    expect(link?.url).toBe('https://netlify.com');
    expect(link?.children?.[0]).toMatchObject({ type: 'text', value: 'a link' });
    expect(paragraph.children?.[0]).toMatchObject({ type: 'text', value: 'Some text with ' });
    expect(paragraph.children?.[2]).toMatchObject({ type: 'text', value: ' in it.' });
  });

  it('should use remark serializer plugins when converting mdast to markdown', () => {
    function withEscapedLessThanChar(this: Processor) {
      if (this.Compiler) {
        this.Compiler.prototype.visitors.text = node => (node.value ?? '').replace(/</g, '&lt;');
      }
    }

    const result = remarkToMarkdown(
      {
        type: 'root',
        children: [
          { type: 'paragraph', children: [{ type: 'text', value: '<3 Netlify' }] },
        ],
      },
      [withEscapedLessThanChar],
    );

    expect(result).toBe('&lt;3 Netlify');
  });

  it('should use remark preset with settings when converting mdast to markdown', () => {
    const settings = {
      emphasis: '_',
      bullet: '-',
    };

    const mdast: MdastRoot = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Some ' },
            { type: 'emphasis', children: [{ type: 'text', value: 'important' }] },
            { type: 'text', value: ' points:' },
          ],
        },
        {
          type: 'list',
          ordered: false,
          start: null,
          spread: false,
          children: [
            {
              type: 'listItem',
              spread: false,
              checked: null,
              children: [{ type: 'paragraph', children: [{ type: 'text', value: 'One' }] }],
            },
            {
              type: 'listItem',
              spread: false,
              checked: null,
              children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Two' }] }],
            },
          ],
        },
      ],
    };

    const result = remarkToMarkdown(mdast, [{ settings }]);

    expect(result).toBe('Some _important_ points:\n\n- One\n- Two');
  });
});

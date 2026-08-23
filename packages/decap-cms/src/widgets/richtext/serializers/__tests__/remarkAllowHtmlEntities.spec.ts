import remarkParse from 'remark-parse';
import unified from 'unified';
import { describe, expect, it } from 'vitest';

import remarkAllowHtmlEntities from '@/widgets/richtext/serializers/remarkAllowHtmlEntities';

import type { MdastRoot } from '@/widgets/richtext/types';

function process(markdown: string) {
  const mdast = unified().use(remarkParse).use(remarkAllowHtmlEntities).parse<MdastRoot>(markdown);

  /**
   * The MDAST will look like:
   *
   * { type: 'root', children: [
   *   { type: 'paragraph', children: [
   *     // results here
   *   ]}
   * ]}
   */
  return mdast.children[0].children?.[0].value;
}

describe('remarkAllowHtmlEntities', () => {
  it('should not decode HTML entities', () => {
    expect(process('&lt;div&gt;')).toEqual('&lt;div&gt;');
  });
});

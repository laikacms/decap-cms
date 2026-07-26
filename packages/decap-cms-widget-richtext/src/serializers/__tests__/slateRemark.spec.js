import slateToRemark from '../slateRemark';
import { remarkToMarkdown } from '../';

/**
 * These specs exercise `slateToRemark` (Slate Raw AST -> MDAST) directly for
 * the main node-type conversion paths. Where the resulting MDAST shape is
 * easiest to verify by eye, we additionally stringify it back to Markdown
 * via `remarkToMarkdown` so the assertions double as a readable round-trip
 * check.
 */

function toMarkdown(slateNodes, opts) {
  const mdast = slateToRemark(slateNodes, opts || {});
  return remarkToMarkdown(mdast, []);
}

describe('slateToRemark', () => {
  it('converts a paragraph with plain text', () => {
    const slate = [
      {
        type: 'p',
        children: [{ text: 'Hello world' }],
      },
    ];

    const mdast = slateToRemark(slate, {});

    expect(mdast.type).toBe('root');
    expect(mdast.children).toHaveLength(1);
    expect(mdast.children[0].type).toBe('paragraph');
    expect(toMarkdown(slate)).toBe('Hello world');
  });

  it('converts headings one through six with the correct depth', () => {
    const headingTypes = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

    headingTypes.forEach((type, index) => {
      const slate = [{ type, children: [{ text: `Heading ${index + 1}` }] }];
      const mdast = slateToRemark(slate, {});

      expect(mdast.children[0].type).toBe('heading');
      expect(mdast.children[0].depth).toBe(index + 1);
    });

    const markdown = toMarkdown([{ type: 'h2', children: [{ text: 'Section title' }] }]);
    expect(markdown).toBe('## Section title');
  });

  it('drops headings that have no text content', () => {
    const slate = [{ type: 'h1', children: [{ text: '' }] }];
    const mdast = slateToRemark(slate, {});

    expect(mdast.children).toEqual([]);
  });

  it('converts an unordered (bulleted) list', () => {
    const slate = [
      {
        type: 'ul',
        children: [
          { type: 'li', children: [{ type: 'lic', children: [{ text: 'First item' }] }] },
          { type: 'li', children: [{ type: 'lic', children: [{ text: 'Second item' }] }] },
        ],
      },
    ];

    const mdast = slateToRemark(slate, {});
    const list = mdast.children[0];

    expect(list.type).toBe('list');
    expect(list.ordered).toBe(false);
    expect(list.children).toHaveLength(2);
    expect(list.children[0].type).toBe('listItem');

    expect(toMarkdown(slate)).toBe('* First item\n* Second item');
  });

  it('converts an ordered (numbered) list and honors a custom start', () => {
    const slate = [
      {
        type: 'ol',
        data: { start: 3 },
        children: [
          { type: 'li', children: [{ type: 'lic', children: [{ text: 'Third item' }] }] },
          { type: 'li', children: [{ type: 'lic', children: [{ text: 'Fourth item' }] }] },
        ],
      },
    ];

    const mdast = slateToRemark(slate, {});
    const list = mdast.children[0];

    expect(list.type).toBe('list');
    expect(list.ordered).toBe(true);
    expect(list.start).toBe(3);
    expect(list.children).toHaveLength(2);
  });

  it('converts a link', () => {
    const slate = [
      {
        type: 'p',
        children: [
          {
            type: 'a',
            url: 'https://example.com',
            title: 'Example',
            children: [{ text: 'a link' }],
          },
        ],
      },
    ];

    const mdast = slateToRemark(slate, {});
    const link = mdast.children[0].children[0];

    expect(link.type).toBe('link');
    expect(link.url).toBe('https://example.com');
    expect(link.title).toBe('Example');

    expect(toMarkdown(slate)).toBe('[a link](https://example.com "Example")');
  });

  it('converts a code block with a language', () => {
    // A block-type sibling (paragraph) must come first so the root-level
    // transform recognizes the children as block nodes and recurses into
    // each one via `convertBlockNode`, rather than treating a lone
    // code-block as inline/text content.
    const slate = [
      { type: 'p', children: [{ text: 'intro' }] },
      {
        type: 'code-block',
        data: { lang: 'js' },
        children: [{ text: "console.log('hi')" }],
      },
    ];

    const mdast = slateToRemark(slate, {});
    const codeBlock = mdast.children[1];

    expect(codeBlock.type).toBe('code');
    expect(codeBlock.lang).toBe('js');
    expect(codeBlock.value).toBe("console.log('hi')");
  });

  it('converts a void code block using the stored code value', () => {
    const slate = [
      { type: 'p', children: [{ text: 'intro' }] },
      {
        type: 'code-block',
        data: { lang: 'js', code: 'const x = 1;' },
        children: [{ text: '' }],
      },
    ];

    const mdast = slateToRemark(slate, { voidCodeBlock: true });
    const codeBlock = mdast.children[1];

    expect(codeBlock.type).toBe('code');
    expect(codeBlock.value).toBe('const x = 1;');
  });

  it('converts bold (strong) and italic (emphasis) marks', () => {
    const slate = [
      {
        type: 'p',
        children: [
          { text: 'plain ' },
          { text: 'bold', bold: true, marks: [{ type: 'bold' }] },
          { text: ' and ' },
          { text: 'italic', italic: true, marks: [{ type: 'italic' }] },
        ],
      },
    ];

    const mdast = slateToRemark(slate, {});
    const [plain, strongNode, middle, emphasisNode] = mdast.children[0].children;

    expect(plain.value).toBe('plain ');
    expect(strongNode.type).toBe('strong');
    expect(middle.value).toBe(' and ');
    expect(emphasisNode.type).toBe('emphasis');

    expect(toMarkdown(slate)).toBe('plain **bold** and *italic*');
  });
});

import u from 'unist-builder';

import remarkWrapHtml from '../remarkWrapHtml';

function makeTree(children) {
  return u('root', children);
}

function run(children) {
  const tree = makeTree(children);
  const transform = remarkWrapHtml();
  return transform(tree);
}

describe('remarkWrapHtml', () => {
  it('wraps a top-level html node in a paragraph', () => {
    const htmlNode = u('html', '<div>foo</div>');
    const result = run([htmlNode]);

    expect(result.children).toHaveLength(1);
    expect(result.children[0].type).toBe('paragraph');
    expect(result.children[0].children).toEqual([htmlNode]);
  });

  it('leaves non-html nodes unchanged', () => {
    const paraNode = u('paragraph', [u('text', 'hello')]);
    const result = run([paraNode]);

    expect(result.children).toHaveLength(1);
    expect(result.children[0]).toBe(paraNode);
  });

  it('handles mixed html and non-html children correctly', () => {
    const htmlNode = u('html', '<span>bar</span>');
    const headingNode = u('heading', { depth: 1 }, [u('text', 'Title')]);
    const paraNode = u('paragraph', [u('text', 'text')]);

    const result = run([headingNode, htmlNode, paraNode]);

    expect(result.children).toHaveLength(3);
    expect(result.children[0]).toBe(headingNode);
    expect(result.children[1].type).toBe('paragraph');
    expect(result.children[1].children).toEqual([htmlNode]);
    expect(result.children[2]).toBe(paraNode);
  });

  it('returns an empty children array when there are no children', () => {
    const result = run([]);

    expect(result.children).toEqual([]);
  });
});

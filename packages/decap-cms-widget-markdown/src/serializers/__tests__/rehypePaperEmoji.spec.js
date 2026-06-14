import rehypePaperEmoji from '../rehypePaperEmoji';

function makeImgNode(properties = {}) {
  return { type: 'element', tagName: 'img', properties, children: [] };
}

function makeElementNode(tagName, children) {
  return { type: 'element', tagName, properties: {}, children };
}

describe('rehypePaperEmoji', () => {
  let transform;

  beforeEach(() => {
    transform = rehypePaperEmoji();
  });

  it('replaces an img node with dataEmojiCh with a text node containing the emoji character', () => {
    const node = makeImgNode({ dataEmojiCh: '😀' });
    const result = transform(node);
    expect(result).toEqual({ type: 'text', value: '😀' });
  });

  it('passes through an img node without dataEmojiCh unchanged', () => {
    const node = makeImgNode({ src: 'image.png', alt: 'photo' });
    const result = transform(node);
    expect(result).toBe(node);
  });

  it('recursively replaces emoji img children of a non-img node', () => {
    const emojiImg = makeImgNode({ dataEmojiCh: '🎉' });
    const parent = makeElementNode('p', [emojiImg]);
    const result = transform(parent);
    expect(result.children).toEqual([{ type: 'text', value: '🎉' }]);
  });
});

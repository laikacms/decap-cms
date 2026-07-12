// jest 27 does not resolve the "platejs/react" package.json `exports` subpath
// (support for subpath exports landed in jest 28), so `defaultEmptyBlock.js`'s
// own `import { ParagraphPlugin } from 'platejs/react'` cannot be resolved
// under test. Stub it out virtually with the real runtime value of
// `ParagraphPlugin.key` (`'p'`), the same way the existing VisualEditor
// tests avoid importing VisualEditor.js directly for this reason.
jest.mock('platejs/react', () => ({ ParagraphPlugin: { key: 'p' } }), { virtual: true });

import defaultEmptyBlock from '../defaultEmptyBlock';

describe('defaultEmptyBlock', () => {
  it('defaults to an empty text node when no text is given', () => {
    expect(defaultEmptyBlock()).toEqual({
      type: 'p',
      children: [{ text: '' }],
    });
  });

  it('wraps the given text in a single paragraph child', () => {
    expect(defaultEmptyBlock('Hello world')).toEqual({
      type: 'p',
      children: [{ text: 'Hello world' }],
    });
  });

  it('returns a fresh object on every call', () => {
    const first = defaultEmptyBlock('same text');
    const second = defaultEmptyBlock('same text');

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.children).not.toBe(second.children);
  });
});

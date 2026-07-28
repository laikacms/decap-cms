import { diffLines } from '../textDiff';

describe('diffLines', () => {
  it('returns all unchanged lines when the texts are identical', () => {
    const text = 'backend:\n  name: git-gateway\ncollections: []';
    expect(diffLines(text, text)).toEqual([
      { type: 'unchanged', value: 'backend:' },
      { type: 'unchanged', value: '  name: git-gateway' },
      { type: 'unchanged', value: 'collections: []' },
    ]);
  });

  it('marks every line as added when the old text is empty', () => {
    expect(diffLines('', 'a\nb')).toEqual([
      { type: 'added', value: 'a' },
      { type: 'added', value: 'b' },
    ]);
  });

  it('marks every line as removed when the new text is empty', () => {
    expect(diffLines('a\nb', '')).toEqual([
      { type: 'removed', value: 'a' },
      { type: 'removed', value: 'b' },
    ]);
  });

  it('detects a single changed line in the middle of a file', () => {
    const oldText = 'backend:\n  name: git-gateway\ncollections: []';
    const newText = 'backend:\n  name: github\ncollections: []';
    expect(diffLines(oldText, newText)).toEqual([
      { type: 'unchanged', value: 'backend:' },
      { type: 'removed', value: '  name: git-gateway' },
      { type: 'added', value: '  name: github' },
      { type: 'unchanged', value: 'collections: []' },
    ]);
  });

  it('detects an appended line', () => {
    const oldText = 'backend:\n  name: github';
    const newText = 'backend:\n  name: github\nmedia_folder: static/images';
    expect(diffLines(oldText, newText)).toEqual([
      { type: 'unchanged', value: 'backend:' },
      { type: 'unchanged', value: '  name: github' },
      { type: 'added', value: 'media_folder: static/images' },
    ]);
  });
});

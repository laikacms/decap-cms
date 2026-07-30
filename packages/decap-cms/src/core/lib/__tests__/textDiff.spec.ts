import { describe, expect, it } from 'vitest';

import { diffLines, isUnchanged } from '@/core/lib/textDiff';

describe('diffLines', () => {
  it('marks every line unchanged when the text is identical', () => {
    const text = 'a\nb\nc';
    expect(diffLines(text, text)).toEqual([
      { type: 'unchanged', value: 'a', oldLineNumber: 1, newLineNumber: 1 },
      { type: 'unchanged', value: 'b', oldLineNumber: 2, newLineNumber: 2 },
      { type: 'unchanged', value: 'c', oldLineNumber: 3, newLineNumber: 3 },
    ]);
  });

  it('reports a pure addition', () => {
    const result = diffLines('a\nb', 'a\nb\nc');
    expect(result).toEqual([
      { type: 'unchanged', value: 'a', oldLineNumber: 1, newLineNumber: 1 },
      { type: 'unchanged', value: 'b', oldLineNumber: 2, newLineNumber: 2 },
      { type: 'added', value: 'c', newLineNumber: 3 },
    ]);
  });

  it('reports a pure removal', () => {
    const result = diffLines('a\nb\nc', 'a\nc');
    expect(result).toEqual([
      { type: 'unchanged', value: 'a', oldLineNumber: 1, newLineNumber: 1 },
      { type: 'removed', value: 'b', oldLineNumber: 2 },
      { type: 'unchanged', value: 'c', oldLineNumber: 3, newLineNumber: 2 },
    ]);
  });

  it('reports a single-line modification as a remove + add pair', () => {
    const result = diffLines('name: old', 'name: new');
    expect(result).toEqual([
      { type: 'removed', value: 'name: old', oldLineNumber: 1 },
      { type: 'added', value: 'name: new', newLineNumber: 1 },
    ]);
  });

  it('handles an empty old text (brand-new content)', () => {
    const result = diffLines('', 'a\nb');
    expect(result.filter(line => line.type === 'added').map(line => line.value)).toEqual(['a', 'b']);
  });

  it('round-trips: reconstructing new/old text from the diff matches the inputs', () => {
    const oldText = 'backend:\n  name: git-gateway\nmedia_folder: static/images';
    const newText = 'backend:\n  name: github\nmedia_folder: static/media\ncollections: []';

    const result = diffLines(oldText, newText);

    const reconstructedOld = result
      .filter(line => line.type !== 'added')
      .map(line => line.value)
      .join('\n');
    const reconstructedNew = result
      .filter(line => line.type !== 'removed')
      .map(line => line.value)
      .join('\n');

    expect(reconstructedOld).toBe(oldText);
    expect(reconstructedNew).toBe(newText);
  });
});

describe('isUnchanged', () => {
  it('is true for identical strings', () => {
    expect(isUnchanged('a\nb', 'a\nb')).toBe(true);
  });

  it('is false for differing strings', () => {
    expect(isUnchanged('a\nb', 'a\nc')).toBe(false);
  });
});

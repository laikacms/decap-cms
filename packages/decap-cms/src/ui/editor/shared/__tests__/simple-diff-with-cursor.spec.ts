// @vitest-environment node
import { describe, expect, it } from 'vitest';

import simpleDiffWithCursor from '@/ui/editor/shared/simple-diff-with-cursor';

describe('simpleDiffWithCursor', () => {
  it('reports no change for identical strings', () => {
    expect(simpleDiffWithCursor('hello', 'hello', 5)).toEqual({
      index: 5,
      insert: '',
      remove: 0,
    });
  });

  it('reports no change for two empty strings', () => {
    expect(simpleDiffWithCursor('', '', 0)).toEqual({ index: 0, insert: '', remove: 0 });
  });

  describe('pure insertion', () => {
    it('inserts at the end', () => {
      expect(simpleDiffWithCursor('abc', 'abcd', 4)).toEqual({
        index: 3,
        insert: 'd',
        remove: 0,
      });
    });

    it('inserts at the start', () => {
      expect(simpleDiffWithCursor('abc', 'xabc', 1)).toEqual({
        index: 0,
        insert: 'x',
        remove: 0,
      });
    });

    it('inserts in the middle', () => {
      expect(simpleDiffWithCursor('ac', 'abc', 2)).toEqual({
        index: 1,
        insert: 'b',
        remove: 0,
      });
    });

    it('inserts into an empty string', () => {
      expect(simpleDiffWithCursor('', 'abc', 3)).toEqual({
        index: 0,
        insert: 'abc',
        remove: 0,
      });
    });
  });

  describe('pure deletion', () => {
    it('deletes at the end', () => {
      expect(simpleDiffWithCursor('abcd', 'abc', 3)).toEqual({
        index: 3,
        insert: '',
        remove: 1,
      });
    });

    it('deletes at the start', () => {
      expect(simpleDiffWithCursor('xabc', 'abc', 0)).toEqual({
        index: 0,
        insert: '',
        remove: 1,
      });
    });

    it('deletes in the middle', () => {
      expect(simpleDiffWithCursor('abc', 'ac', 1)).toEqual({
        index: 1,
        insert: '',
        remove: 1,
      });
    });

    it('deletes everything', () => {
      expect(simpleDiffWithCursor('abc', '', 0)).toEqual({
        index: 0,
        insert: '',
        remove: 3,
      });
    });
  });

  describe('replacement', () => {
    it('replaces a single character', () => {
      expect(simpleDiffWithCursor('abc', 'axc', 2)).toEqual({
        index: 1,
        insert: 'x',
        remove: 1,
      });
    });

    it('replaces a region with one of different length', () => {
      expect(simpleDiffWithCursor('abcdef', 'abXYZef', 5)).toEqual({
        index: 2,
        insert: 'XYZ',
        remove: 2,
      });
    });

    it('replaces the whole string', () => {
      expect(simpleDiffWithCursor('abc', 'xyz', 3)).toEqual({
        index: 0,
        insert: 'xyz',
        remove: 3,
      });
    });
  });

  describe('cursor position relative to the changed region', () => {
    it('cursor before the region still finds the leftmost-consistent diff', () => {
      expect(simpleDiffWithCursor('abcdef', 'abXdef', 0)).toEqual({
        index: 2,
        insert: 'X',
        remove: 1,
      });
    });

    it('cursor inside the region', () => {
      expect(simpleDiffWithCursor('abcdef', 'abXdef', 2)).toEqual({
        index: 2,
        insert: 'X',
        remove: 1,
      });
    });

    it('cursor after the region', () => {
      expect(simpleDiffWithCursor('abcdef', 'abXdef', 6)).toEqual({
        index: 2,
        insert: 'X',
        remove: 1,
      });
    });

    it('uses the cursor to disambiguate repeated characters when inserting', () => {
      // 'aa' -> 'aaa': inserting after the first vs. second vs. last 'a' is equivalent text-wise,
      // the cursor decides where the insertion is reported.
      expect(simpleDiffWithCursor('aa', 'aaa', 1)).toEqual({ index: 1, insert: 'a', remove: 0 });
      expect(simpleDiffWithCursor('aa', 'aaa', 3)).toEqual({ index: 2, insert: 'a', remove: 0 });
    });

    it('uses the cursor to disambiguate repeated characters when deleting', () => {
      expect(simpleDiffWithCursor('aaa', 'aa', 1)).toEqual({ index: 1, insert: '', remove: 1 });
      expect(simpleDiffWithCursor('aaa', 'aa', 3)).toEqual({ index: 2, insert: '', remove: 1 });
    });
  });
});

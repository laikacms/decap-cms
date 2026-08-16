import { describe, expect, it } from 'vitest';

import { applyJsonPatch, JsonPatchError } from '@/core/lib/jsonPatch';

import type { LlmPatchOperation } from '@/lib/util/index';

/**
 * RFC 6902 conformance for the hand-rolled applier. The examples in the
 * "spec examples" block are lifted from RFC 6902 appendix A, so a regression
 * here is a spec violation rather than a matter of taste.
 */

function patch<T>(document: T, ...operations: LlmPatchOperation[]): T {
  return applyJsonPatch(document, operations);
}

describe('applyJsonPatch', () => {
  describe('add', () => {
    it('adds an object member', () => {
      expect(patch({ foo: 'bar' }, { op: 'add', path: '/baz', value: 'qux' })).toEqual({
        foo: 'bar',
        baz: 'qux',
      });
    });

    it('inserts into an array at the given index, shifting the rest', () => {
      expect(patch({ foo: ['a', 'b', 'c'] }, { op: 'add', path: '/foo/1', value: 'x' })).toEqual({
        foo: ['a', 'x', 'b', 'c'],
      });
    });

    it('appends with "-"', () => {
      expect(patch({ foo: ['a'] }, { op: 'add', path: '/foo/-', value: 'b' })).toEqual({
        foo: ['a', 'b'],
      });
    });

    it('replaces an existing object member', () => {
      expect(patch({ foo: 'bar' }, { op: 'add', path: '/foo', value: 'baz' })).toEqual({
        foo: 'baz',
      });
    });

    it('rejects an index past the end of the array', () => {
      expect(() => patch({ foo: ['a'] }, { op: 'add', path: '/foo/3', value: 'b' })).toThrow(
        JsonPatchError,
      );
    });

    it('requires a value, distinguishing an absent one from undefined', () => {
      expect(() => patch({}, { op: 'add', path: '/a' })).toThrow(/requires a value/);
      expect(patch<Record<string, unknown>>({}, { op: 'add', path: '/a', value: undefined }))
        .toEqual({ a: undefined });
    });

    it('replaces the whole document for the empty path', () => {
      expect(patch({ foo: 'bar' }, { op: 'add', path: '', value: { baz: 'qux' } })).toEqual({
        baz: 'qux',
      });
    });
  });

  describe('remove', () => {
    it('removes an object member', () => {
      expect(patch({ foo: 'bar', baz: 'qux' }, { op: 'remove', path: '/baz' })).toEqual({
        foo: 'bar',
      });
    });

    it('removes an array element, closing the gap', () => {
      expect(patch({ foo: ['a', 'b', 'c'] }, { op: 'remove', path: '/foo/1' })).toEqual({
        foo: ['a', 'c'],
      });
    });

    it('rejects removing something that is not there', () => {
      expect(() => patch({ foo: 'bar' }, { op: 'remove', path: '/nope' })).toThrow(
        /does not exist/,
      );
    });

    it('rejects removing the whole document', () => {
      expect(() => patch({ foo: 'bar' }, { op: 'remove', path: '' })).toThrow(
        /cannot remove the whole document/,
      );
    });
  });

  describe('replace', () => {
    it('replaces an existing member', () => {
      expect(patch({ foo: 'bar' }, { op: 'replace', path: '/foo', value: 'baz' })).toEqual({
        foo: 'baz',
      });
    });

    it('rejects replacing a member that does not exist', () => {
      expect(() => patch({ foo: 'bar' }, { op: 'replace', path: '/baz', value: 'x' })).toThrow(
        /does not exist/,
      );
    });
  });

  describe('move', () => {
    it('moves a value between paths', () => {
      expect(
        patch(
          { foo: { bar: 'baz' }, qux: {} },
          { op: 'move', from: '/foo/bar', path: '/qux/thud' },
        ),
      ).toEqual({ foo: {}, qux: { thud: 'baz' } });
    });

    it('moves within an array', () => {
      expect(patch({ foo: ['a', 'b', 'c'] }, { op: 'move', from: '/foo/1', path: '/foo/0' }))
        .toEqual({ foo: ['b', 'a', 'c'] });
    });

    it('treats a move onto itself as a no-op', () => {
      expect(patch({ foo: 'bar' }, { op: 'move', from: '/foo', path: '/foo' })).toEqual({
        foo: 'bar',
      });
    });

    it('rejects moving a location into its own child (RFC 6902 4.4)', () => {
      expect(() => patch({ foo: { bar: {} } }, { op: 'move', from: '/foo', path: '/foo/bar/baz' }))
        .toThrow(/into its own child/);
    });

    it('requires a from path', () => {
      expect(() => patch({ foo: 'bar' }, { op: 'move', path: '/baz' })).toThrow(/requires a "from"/);
    });
  });

  describe('copy', () => {
    it('copies a value, leaving the source in place', () => {
      expect(patch({ foo: { bar: 'baz' } }, { op: 'copy', from: '/foo/bar', path: '/qux' }))
        .toEqual({ foo: { bar: 'baz' }, qux: 'baz' });
    });

    it('shares the copied reference rather than deep-cloning it', () => {
      const nested = { deep: true };
      const result = patch({ foo: nested }, { op: 'copy', from: '/foo', path: '/bar' });

      // Structural sharing is the point of this module: a copied subtree that
      // holds class instances must not be flattened.
      expect(result.bar).toBe(nested);
    });
  });

  describe('test', () => {
    it('passes on a structural match regardless of key order', () => {
      expect(() =>
        patch({ foo: { a: 1, b: 2 } }, { op: 'test', path: '/foo', value: { b: 2, a: 1 } })
      ).not.toThrow();
    });

    it('fails on a mismatch', () => {
      expect(() => patch({ foo: 'bar' }, { op: 'test', path: '/foo', value: 'baz' })).toThrow(
        /test failed/,
      );
    });

    it('distinguishes a number from its string form', () => {
      expect(() => patch({ foo: 1 }, { op: 'test', path: '/foo', value: '1' })).toThrow(
        /test failed/,
      );
    });
  });

  describe('pointer syntax', () => {
    it('unescapes ~1 as "/" and ~0 as "~"', () => {
      const document = { 'a/b': 1, 'm~n': 2 };

      expect(patch(document, { op: 'replace', path: '/a~1b', value: 9 })).toEqual({
        'a/b': 9,
        'm~n': 2,
      });
      expect(patch(document, { op: 'replace', path: '/m~0n', value: 9 })).toEqual({
        'a/b': 1,
        'm~n': 9,
      });
    });

    it('rejects a path that does not start with "/"', () => {
      expect(() => patch({ foo: 'bar' }, { op: 'replace', path: 'foo', value: 'x' })).toThrow(
        /must be empty or start with/,
      );
    });

    it('rejects a non-numeric or leading-zero array index', () => {
      expect(() => patch({ foo: ['a'] }, { op: 'replace', path: '/foo/bar', value: 'x' })).toThrow(
        /not a valid array index/,
      );
      expect(() => patch({ foo: ['a'] }, { op: 'replace', path: '/foo/01', value: 'x' })).toThrow(
        /not a valid array index/,
      );
    });

    it('rejects "-" outside of add', () => {
      expect(() => patch({ foo: ['a'] }, { op: 'remove', path: '/foo/-' })).toThrow(
        /only valid for add/,
      );
    });
  });

  describe('immutability and structural sharing', () => {
    it('never mutates the input document', () => {
      const document = { title: 'a', tags: ['x'], meta: { keep: true } };
      const snapshot = structuredClone(document);

      patch(
        document,
        { op: 'replace', path: '/title', value: 'b' },
        { op: 'add', path: '/tags/-', value: 'y' },
      );

      expect(document).toEqual(snapshot);
    });

    it('shares every branch that was not patched', () => {
      class RichtextValue {
        constructor(readonly body: string) {}
      }
      const body = new RichtextValue('untouched');
      const meta = { author: 'ada' };
      const document = { title: 'a', body, meta };

      const result = patch(document, { op: 'replace', path: '/title', value: 'b' });

      // The reason this module exists: a JSON round-trip would turn `body`
      // into a plain object and break the richtext widget.
      expect(result.body).toBe(body);
      expect(result.body).toBeInstanceOf(RichtextValue);
      expect(result.meta).toBe(meta);
      expect(result).not.toBe(document);
    });

    it('copies only the containers along a nested path', () => {
      const sibling = { untouched: true };
      const document = { list: [{ a: 1 }, sibling] };

      const result = patch(document, { op: 'replace', path: '/list/0/a', value: 2 });

      expect(result.list[1]).toBe(sibling);
      expect(result.list).not.toBe(document.list);
      expect(result.list[0]).toEqual({ a: 2 });
    });
  });

  describe('failure atomicity', () => {
    it('leaves the input untouched when a later operation fails', () => {
      const document = { a: 1 };

      expect(() =>
        patch(
          document,
          { op: 'replace', path: '/a', value: 2 },
          { op: 'replace', path: '/missing', value: 3 },
        )
      ).toThrow(JsonPatchError);

      expect(document).toEqual({ a: 1 });
    });

    it('reports which operation failed', () => {
      try {
        patch({ a: 1 }, { op: 'test', path: '/a', value: 1 }, { op: 'test', path: '/a', value: 2 });
        expect.unreachable('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(JsonPatchError);
        expect((error as JsonPatchError).operationIndex).toBe(1);
        expect((error as Error).message).toMatch(/^JSON Patch operation 1:/);
      }
    });

    it('rejects an unknown op', () => {
      expect(() => patch({ a: 1 }, { op: 'frobnicate', path: '/a' } as never)).toThrow(
        /unknown op "frobnicate"/,
      );
    });
  });

  describe('spec examples (RFC 6902 appendix A)', () => {
    it('A.1 adding an object member', () => {
      expect(patch({ foo: 'bar' }, { op: 'add', path: '/baz', value: 'qux' })).toEqual({
        baz: 'qux',
        foo: 'bar',
      });
    });

    it('A.3 removing an object member', () => {
      expect(patch({ baz: 'qux', foo: 'bar' }, { op: 'remove', path: '/baz' })).toEqual({
        foo: 'bar',
      });
    });

    it('A.6 moving a value', () => {
      expect(
        patch(
          { foo: { bar: 'baz', waldo: 'fred' }, qux: { corge: 'grault' } },
          { op: 'move', from: '/foo/waldo', path: '/qux/thud' },
        ),
      ).toEqual({ foo: { bar: 'baz' }, qux: { corge: 'grault', thud: 'fred' } });
    });

    it('A.7 moving an array element', () => {
      expect(
        patch({ foo: ['all', 'grass', 'cows', 'eat'] }, {
          op: 'move',
          from: '/foo/1',
          path: '/foo/3',
        }),
      ).toEqual({ foo: ['all', 'cows', 'eat', 'grass'] });
    });

    it('A.10 adding a nested member object', () => {
      expect(patch({ foo: 'bar' }, { op: 'add', path: '/child', value: { grandchild: {} } }))
        .toEqual({ foo: 'bar', child: { grandchild: {} } });
    });

    it('A.16 adding an array value', () => {
      expect(patch({ foo: ['bar'] }, { op: 'add', path: '/foo/-', value: ['abc', 'def'] })).toEqual({
        foo: ['bar', ['abc', 'def']],
      });
    });
  });
});

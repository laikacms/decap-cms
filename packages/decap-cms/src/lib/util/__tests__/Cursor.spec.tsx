import { describe, expect, it, vi } from 'vitest';

import Cursor from '@/lib/util/Cursor.js';

describe('Cursor', () => {
  describe('createStore overloads (via constructor)', () => {
    it('defaults to empty actions/data/meta with no args', () => {
      const cursor = new Cursor();

      expect(cursor.actions).toEqual(new Set());
      expect(cursor.data).toEqual({});
      expect(cursor.meta).toEqual({});
    });

    it('defaults to empty actions/data/meta when the single arg is null', () => {
      const cursor = new Cursor(null);

      expect(cursor.actions).toEqual(new Set());
      expect(cursor.data).toEqual({});
      expect(cursor.meta).toEqual({});
    });

    it('accepts a single object arg with actions/data/meta', () => {
      const cursor = new Cursor({
        actions: ['next', 'prev'],
        data: { foo: 'bar' },
        meta: { page: 2 },
      });

      expect(cursor.actions).toEqual(new Set(['next', 'prev']));
      expect(cursor.data).toEqual({ foo: 'bar' });
      expect(cursor.meta).toEqual({ page: 2 });
    });

    it('fills in defaults for missing keys on a single object arg', () => {
      const cursor = new Cursor({ data: { foo: 'bar' } });

      expect(cursor.actions).toEqual(new Set());
      expect(cursor.data).toEqual({ foo: 'bar' });
      expect(cursor.meta).toEqual({});
    });

    it('accepts positional args (actions, data, meta)', () => {
      const cursor = new Cursor(['next'], { foo: 'bar' }, { page: 1 });

      expect(cursor.actions).toEqual(new Set(['next']));
      expect(cursor.data).toEqual({ foo: 'bar' });
      expect(cursor.meta).toEqual({ page: 1 });
    });

    it('defaults missing positional args to empty values', () => {
      const cursor = new Cursor(undefined, undefined, undefined);

      expect(cursor.actions).toEqual(new Set());
      expect(cursor.data).toEqual({});
      expect(cursor.meta).toEqual({});
    });

    it('returns the same instance when constructed from an existing Cursor', () => {
      const original = new Cursor({ actions: ['next'] });
      const wrapped = new Cursor(original);

      expect(wrapped).toBe(original);
    });

    it('exposes a static create() that mirrors the constructor', () => {
      const cursor = Cursor.create({ actions: ['next'] });

      expect(cursor).toBeInstanceOf(Cursor);
      expect(cursor.actions).toEqual(new Set(['next']));
    });
  });

  describe('filterUnknownMetaKeys via meta accessor', () => {
    it('drops unknown keys and keeps known keys on construction', () => {
      const cursor = new Cursor({
        meta: {
          page: 2,
          count: 10,
          pageSize: 20,
          pageCount: 5,
          extension: 'md',
          folder: 'posts',
          depth: 1,
          index: 0,
          usingOldPaginationAPI: true,
          unknownKey: 'should be dropped',
          anotherUnknown: 42,
        },
      });

      expect(cursor.meta).toEqual({
        page: 2,
        count: 10,
        pageSize: 20,
        pageCount: 5,
        extension: 'md',
        folder: 'posts',
        depth: 1,
        index: 0,
      });
    });

    it('drops unknown keys when set via setMeta', () => {
      const cursor = new Cursor().setMeta({ page: 1, bogus: 'nope' });

      expect(cursor.meta).toEqual({ page: 1 });
    });

    it('drops unknown keys when merged via mergeMeta and preserves existing known meta', () => {
      const cursor = new Cursor({ meta: { page: 1 } }).mergeMeta({
        count: 3,
        bogus: 'nope',
      });

      expect(cursor.meta).toEqual({ page: 1, count: 3 });
    });
  });

  describe('action accessors', () => {
    it('hasAction reports membership', () => {
      const cursor = new Cursor({ actions: ['next'] });

      expect(cursor.hasAction('next')).toBe(true);
      expect(cursor.hasAction('prev')).toBe(false);
    });

    it('addAction returns a new Cursor with the action added, without mutating the original', () => {
      const original = new Cursor({ actions: ['next'] });
      const updated = original.addAction('prev');

      expect(updated).not.toBe(original);
      expect(updated.actions).toEqual(new Set(['next', 'prev']));
      expect(original.actions).toEqual(new Set(['next']));
    });

    it('removeAction returns a new Cursor without the given action', () => {
      const original = new Cursor({ actions: ['next', 'prev'] });
      const updated = original.removeAction('prev');

      expect(updated.actions).toEqual(new Set(['next']));
      expect(original.actions).toEqual(new Set(['next', 'prev']));
    });

    it('setActions replaces the action set entirely', () => {
      const cursor = new Cursor({ actions: ['next'] }).setActions(['first', 'last']);

      expect(cursor.actions).toEqual(new Set(['first', 'last']));
    });

    it('mergeActions unions with the existing action set', () => {
      const cursor = new Cursor({ actions: ['next'] }).mergeActions(new Set(['prev', 'next']));

      expect(cursor.actions).toEqual(new Set(['next', 'prev']));
    });

    it('getActionHandlers invokes the handler for each action and collects results', () => {
      const cursor = new Cursor({ actions: ['next', 'prev'] });
      const handler = vi.fn((action: string) => `handled:${action}`);

      const result = cursor.getActionHandlers(handler);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith('next');
      expect(handler).toHaveBeenCalledWith('prev');
      expect(result).toEqual({ next: 'handled:next', prev: 'handled:prev' });
    });
  });

  describe('data accessors', () => {
    it('setData replaces the data entirely', () => {
      const cursor = new Cursor({ data: { foo: 'bar' } }).setData({ baz: 'qux' });

      expect(cursor.data).toEqual({ baz: 'qux' });
    });

    it('mergeData merges into existing data', () => {
      const cursor = new Cursor({ data: { foo: 'bar' } }).mergeData({ baz: 'qux' });

      expect(cursor.data).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('clearData empties the data', () => {
      const cursor = new Cursor({ data: { foo: 'bar' } }).clearData();

      expect(cursor.data).toEqual({});
    });

    it('wrapData nests the previous data under wrapped_cursor_data', () => {
      const cursor = new Cursor({ data: { foo: 'bar' } }).wrapData({ page: 1 });

      expect(cursor.data).toEqual({ page: 1, wrapped_cursor_data: { foo: 'bar' } });
    });

    it('unwrapData restores the inner cursor and strips wrapped_cursor_data from the outer data', () => {
      const outer = new Cursor({ data: { foo: 'bar' } }).wrapData({ page: 1 });

      const [rest, inner] = outer.unwrapData();

      expect(rest).toEqual({ page: 1 });
      expect(inner.data).toEqual({ foo: 'bar' });
    });

    it('unwrapData yields an empty inner data object when nothing was wrapped', () => {
      const cursor = new Cursor({ data: { page: 1 } });

      const [rest, inner] = cursor.unwrapData();

      expect(rest).toEqual({ page: 1 });
      expect(inner.data).toEqual({});
    });
  });
});

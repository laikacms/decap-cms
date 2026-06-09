import { Map, Set } from 'immutable';

import Cursor from '../Cursor';

describe('Cursor', () => {
  describe('construction', () => {
    it('creates an empty cursor with no args', () => {
      const cursor = new Cursor();
      expect(cursor.actions).toEqual(Set());
      expect(cursor.data).toEqual(Map());
      expect(cursor.meta).toEqual(Map());
    });

    it('creates a cursor from an object', () => {
      const cursor = new Cursor({
        actions: ['append', 'prepend'],
        data: { page: 1 },
        meta: { index: 0 },
      });
      expect(cursor.actions).toEqual(Set(['append', 'prepend']));
      expect(cursor.data).toEqual(Map({ page: 1 }));
      expect(cursor.meta).toEqual(Map({ index: 0 }));
    });

    it('returns the same Cursor instance when passed a Cursor', () => {
      const original = new Cursor({ actions: ['next'] });
      const copy = new Cursor(original);
      expect(copy).toBe(original);
    });

    it('Cursor.create is equivalent to new Cursor', () => {
      const cursor = Cursor.create({ actions: ['next'], data: { foo: 'bar' } });
      expect(cursor).toBeInstanceOf(Cursor);
      expect(cursor.actions).toEqual(Set(['next']));
    });

    it('creates a cursor from actions/data/meta positional args', () => {
      const cursor = new Cursor(['next', 'prev'], { page: 2 }, { count: 10 });
      expect(cursor.actions).toEqual(Set(['next', 'prev']));
      expect(cursor.data).toEqual(Map({ page: 2 }));
      expect(cursor.meta).toEqual(Map({ count: 10 }));
    });
  });

  describe('hasAction', () => {
    it('returns true for an existing action', () => {
      const cursor = new Cursor({ actions: ['next'] });
      expect(cursor.hasAction('next')).toBe(true);
    });

    it('returns false for a missing action', () => {
      const cursor = new Cursor({ actions: ['next'] });
      expect(cursor.hasAction('prev')).toBe(false);
    });
  });

  describe('addAction', () => {
    it('adds an action and returns a new Cursor', () => {
      const cursor = new Cursor();
      const updated = cursor.addAction('next');
      expect(updated).toBeInstanceOf(Cursor);
      expect(updated).not.toBe(cursor);
      expect(updated.hasAction('next')).toBe(true);
    });

    it('adding an existing action is idempotent', () => {
      const cursor = new Cursor({ actions: ['next'] });
      const updated = cursor.addAction('next');
      expect(updated.actions.size).toBe(1);
    });
  });

  describe('removeAction', () => {
    it('removes an existing action', () => {
      const cursor = new Cursor({ actions: ['next', 'prev'] });
      const updated = cursor.removeAction('next');
      expect(updated.hasAction('next')).toBe(false);
      expect(updated.hasAction('prev')).toBe(true);
    });

    it('removing a non-existent action leaves cursor unchanged', () => {
      const cursor = new Cursor({ actions: ['next'] });
      const updated = cursor.removeAction('prev');
      expect(updated.actions).toEqual(Set(['next']));
    });
  });

  describe('setActions', () => {
    it('replaces all actions', () => {
      const cursor = new Cursor({ actions: ['next', 'prev'] });
      const updated = cursor.setActions(['append']);
      expect(updated.actions).toEqual(Set(['append']));
    });

    it('can set to empty', () => {
      const cursor = new Cursor({ actions: ['next'] });
      const updated = cursor.setActions([]);
      expect(updated.actions).toEqual(Set());
    });
  });

  describe('mergeActions', () => {
    it('unions actions with a new Set', () => {
      const cursor = new Cursor({ actions: ['next'] });
      const updated = cursor.mergeActions(Set(['prev', 'append']));
      expect(updated.actions).toEqual(Set(['next', 'prev', 'append']));
    });

    it('does not duplicate existing actions', () => {
      const cursor = new Cursor({ actions: ['next'] });
      const updated = cursor.mergeActions(Set(['next', 'prev']));
      expect(updated.actions.size).toBe(2);
    });
  });

  describe('setData', () => {
    it('replaces data entirely', () => {
      const cursor = new Cursor({ data: { a: 1, b: 2 } });
      const updated = cursor.setData({ c: 3 });
      expect(updated.data).toEqual(Map({ c: 3 }));
    });
  });

  describe('mergeData', () => {
    it('merges new keys into existing data', () => {
      const cursor = new Cursor({ data: { a: 1 } });
      const updated = cursor.mergeData({ b: 2 });
      expect(updated.data).toEqual(Map({ a: 1, b: 2 }));
    });

    it('overwrites existing keys with merged values', () => {
      const cursor = new Cursor({ data: { a: 1, b: 2 } });
      const updated = cursor.mergeData({ b: 99 });
      expect(updated.data.get('b')).toBe(99);
      expect(updated.data.get('a')).toBe(1);
    });
  });

  describe('wrapData / unwrapData', () => {
    it('round-trips: wrapData then unwrapData restores original data and wrapper', () => {
      // wrapData(wrapperObj) stores original cursor data under wrapped_cursor_data in wrapperObj
      // unwrapData() returns [wrapperObj without wrapped_cursor_data key, Cursor with original data]
      const cursor = new Cursor({ data: { page: 3 } });
      const wrapped = cursor.wrapData({ extra: 'info' });

      const [outerData, innerCursor] = wrapped.unwrapData();

      // outer (wrapper) data — extra key present, wrapped_cursor_data stripped
      expect(outerData).toEqual(Map({ extra: 'info' }));
      // inner cursor holds the original data
      expect(innerCursor.data).toEqual(Map({ page: 3 }));
    });

    it('wrapData stores original data under wrapped_cursor_data', () => {
      const cursor = new Cursor({ data: { page: 1 } });
      const wrapped = cursor.wrapData({ wrapper: true });
      expect(wrapped.data.get('wrapper')).toBe(true);
      expect(Map.isMap(wrapped.data.get('wrapped_cursor_data'))).toBe(true);
    });

    it('unwrapData returns the outer data without wrapped_cursor_data key', () => {
      const cursor = new Cursor({ data: { page: 1 } });
      const wrapped = cursor.wrapData({ wrapper: true });
      const [outerData] = wrapped.unwrapData();
      expect(outerData.has('wrapped_cursor_data')).toBe(false);
      expect(outerData.get('wrapper')).toBe(true);
    });
  });

  describe('setMeta', () => {
    it('replaces meta entirely', () => {
      const cursor = new Cursor({ meta: { index: 0 } });
      const updated = cursor.setMeta({ page: 2 });
      expect(updated.meta).toEqual(Map({ page: 2 }));
      expect(updated.meta.has('index')).toBe(false);
    });
  });

  describe('mergeMeta', () => {
    it('merges new keys into existing meta', () => {
      const cursor = new Cursor({ meta: { index: 0 } });
      const updated = cursor.mergeMeta({ page: 2, count: 50 });
      expect(updated.meta.get('index')).toBe(0);
      expect(updated.meta.get('page')).toBe(2);
      expect(updated.meta.get('count')).toBe(50);
    });
  });

  describe('filterUnknownMetaKeys', () => {
    it('strips unknown meta keys on construction', () => {
      const cursor = new Cursor({ meta: { index: 0, unknownKey: 'should be stripped' } });
      expect(cursor.meta.has('unknownKey')).toBe(false);
      expect(cursor.meta.get('index')).toBe(0);
    });

    it('keeps all known meta keys', () => {
      const knownMeta = {
        index: 0,
        page: 1,
        count: 100,
        pageSize: 10,
        pageCount: 10,
        usingOldPaginationAPI: false,
        extension: 'md',
        folder: 'posts',
        depth: 1,
      };
      const cursor = new Cursor({ meta: knownMeta });
      Object.keys(knownMeta).forEach(key => {
        expect(cursor.meta.has(key)).toBe(true);
      });
    });

    it('strips unknown keys via setMeta', () => {
      const cursor = new Cursor();
      const updated = cursor.setMeta({ page: 1, badKey: 'nope' });
      expect(updated.meta.has('badKey')).toBe(false);
      expect(updated.meta.get('page')).toBe(1);
    });

    it('strips unknown keys via mergeMeta', () => {
      const cursor = new Cursor({ meta: { index: 0 } });
      const updated = cursor.mergeMeta({ count: 5, illegalKey: 'bad' });
      expect(updated.meta.has('illegalKey')).toBe(false);
      expect(updated.meta.get('count')).toBe(5);
      expect(updated.meta.get('index')).toBe(0);
    });
  });
});

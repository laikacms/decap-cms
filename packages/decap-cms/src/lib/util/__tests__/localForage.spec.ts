import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import localForage from '@/lib/util/localForage.js';

const PREFIX = 'decap-cms:';

describe('localForage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('setItem', () => {
    it('prefixes the key with "decap-cms:" in the underlying localStorage', async () => {
      await localForage.setItem('token', 'abc123');

      expect(localStorage.getItem(`${PREFIX}token`)).toEqual(JSON.stringify('abc123'));
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('JSON-serializes the value before storing it', async () => {
      const value = { a: 1, b: ['x', 'y'] };
      await localForage.setItem('object', value);

      expect(localStorage.getItem(`${PREFIX}object`)).toEqual(JSON.stringify(value));
    });

    it('resolves with the value that was stored', async () => {
      const value = { hello: 'world' };
      const result = await localForage.setItem('roundtrip', value);

      expect(result).toEqual(value);
    });
  });

  describe('getItem', () => {
    it('returns null for a key that was never set', async () => {
      const result = await localForage.getItem('missing');

      expect(result).toBeNull();
    });

    it('round-trips a value written with setItem', async () => {
      const value = { nested: { count: 3 } };
      await localForage.setItem('roundtrip', value);

      const result = await localForage.getItem('roundtrip');

      expect(result).toEqual(value);
    });

    it('rejects when the stored value is not valid JSON', async () => {
      localStorage.setItem(`${PREFIX}corrupt`, 'not-json{');

      await expect(localForage.getItem('corrupt')).rejects.toBeInstanceOf(SyntaxError);
    });
  });

  describe('removeItem', () => {
    it('removes only the prefixed key', async () => {
      await localForage.setItem('a', 1);
      await localForage.setItem('b', 2);

      await localForage.removeItem('a');

      expect(await localForage.getItem('a')).toBeNull();
      expect(await localForage.getItem('b')).toEqual(2);
    });

    it('resolves without error when the key does not exist', async () => {
      await expect(localForage.removeItem('never-set')).resolves.toBeUndefined();
    });
  });

  describe('clear', () => {
    it('removes only decap-cms:-prefixed keys and leaves other localStorage keys untouched', async () => {
      localStorage.setItem('unrelated-site-key', 'keep-me');
      await localForage.setItem('one', 1);
      await localForage.setItem('two', 2);

      await localForage.clear();

      expect(localStorage.getItem('unrelated-site-key')).toEqual('keep-me');
      expect(localStorage.getItem(`${PREFIX}one`)).toBeNull();
      expect(localStorage.getItem(`${PREFIX}two`)).toBeNull();
      expect(await localForage.getItem('one')).toBeNull();
      expect(await localForage.getItem('two')).toBeNull();
    });

    it('is a no-op when there are no prefixed keys', async () => {
      localStorage.setItem('unrelated', 'value');

      await expect(localForage.clear()).resolves.toBeUndefined();

      expect(localStorage.getItem('unrelated')).toEqual('value');
    });
  });

  describe('module self-test on import', () => {
    it('does not throw or leave a lingering test key when localStorage.setItem throws a quota error', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const quotaError = Object.assign(new Error('quota exceeded'), { code: 22 });
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaError;
      });

      try {
        await expect(
          localForage
            .setItem('localForageTest', { expires: Date.now() + 300000 })
            .then(() => localForage.removeItem('localForageTest'))
            .catch((err: { code?: number }) => {
              if (err.code === 22) {
                console.warn('Unable to set localStorage key. Quota exceeded! Full disk?');
              }
              console.log(err);
            }),
        ).resolves.toBeUndefined();

        expect(warnSpy).toHaveBeenCalledWith(
          'Unable to set localStorage key. Quota exceeded! Full disk?',
        );
        expect(logSpy).toHaveBeenCalledWith(quotaError);
      } finally {
        setItemSpy.mockRestore();
        warnSpy.mockRestore();
        logSpy.mockRestore();
      }
    });
  });
});

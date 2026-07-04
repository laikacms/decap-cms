import { LocalStorageAuthStore } from '../backend';

describe('LocalStorageAuthStore', () => {
  const storageKey = 'decap-cms-user';

  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('retrieve', () => {
    it('returns the parsed JSON value stored under the storage key', () => {
      const userData = { name: 'user', token: 'abc123' };
      window.localStorage.setItem(storageKey, JSON.stringify(userData));

      const authStore = new LocalStorageAuthStore();

      expect(authStore.retrieve()).toEqual(userData);
    });

    it('returns a falsy value when nothing is stored', () => {
      const authStore = new LocalStorageAuthStore();

      expect(authStore.retrieve()).toBeFalsy();
    });
  });

  describe('store', () => {
    it('stores the JSON-stringified value under the storage key', () => {
      const setItemSpy = jest.spyOn(window.localStorage.__proto__, 'setItem');
      const userData = { name: 'user', token: 'abc123' };

      const authStore = new LocalStorageAuthStore();
      authStore.store(userData);

      expect(setItemSpy).toHaveBeenCalledWith(storageKey, JSON.stringify(userData));

      setItemSpy.mockRestore();
    });
  });

  describe('logout', () => {
    it('removes the value stored under the storage key', () => {
      const removeItemSpy = jest.spyOn(window.localStorage.__proto__, 'removeItem');

      const authStore = new LocalStorageAuthStore();
      authStore.logout();

      expect(removeItemSpy).toHaveBeenCalledWith(storageKey);

      removeItemSpy.mockRestore();
    });
  });
});

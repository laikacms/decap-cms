import { describe, expect, it, vi } from 'vitest';

import { Backend } from '@/core/backend';
import { FOLDER } from '@/core/constants/collectionTypes';

// Core hooks a caching backend (Decap Turbo) relies on: the free-text search
// term and the i18n sibling selector passed to `allEntriesByFolder`
// (upstream a8bec9b87, b26cb2722), the body only searched when the backend
// says it searched it (e57639bcd), and the stored user read back fresh
// (fbb445dd3).

function backendWith(implementation: Record<string, unknown>, authStore?: unknown) {
  return new Backend(implementation as never, {
    config: { backend: {} } as never,
    backendName: 'github',
    authStore: authStore as never,
  });
}

function collectionWithI18n(structure: string) {
  return {
    name: 'posts',
    type: FOLDER,
    folder: 'content/posts',
    extension: 'md',
    fields: [{ name: 'title', widget: 'string' }],
    i18n: { structure, locales: ['en', 'de', 'si'], default_locale: 'en' },
  } as never;
}

describe('Backend hooks for caching backends', () => {
  describe('listAllEntries locale siblings', () => {
    // A listing wants one file per entry, so its path regex narrows to the
    // default locale. The editor reads every locale as its own file; the
    // extra selector is how a caching backend learns which files those are.
    function implementationFor() {
      const implementation: Record<string, unknown> = {
        allEntriesByFolder: vi.fn().mockResolvedValue([]),
      };
      implementation.init = vi.fn(() => implementation);
      return implementation as { init: () => unknown, allEntriesByFolder: ReturnType<typeof vi.fn> };
    }

    it('passes a selector for the locales the listing leaves out', async () => {
      const implementation = implementationFor();
      const backend = backendWith(implementation);

      await backend.listAllEntries(collectionWithI18n('multiple_files'));

      const [, , , pathRegex, , siblingRegex] = implementation.allEntriesByFolder.mock.calls[0];
      expect(pathRegex.test('content/posts/slug.en.md')).toBe(true);
      expect(pathRegex.test('content/posts/slug.de.md')).toBe(false);
      expect(siblingRegex.test('content/posts/slug.de.md')).toBe(true);
      expect(siblingRegex.test('content/posts/slug.si.md')).toBe(true);
      expect(siblingRegex.test('content/posts/slug.en.md')).toBe(false);
    });

    it('covers multiple_folders the same way', async () => {
      const implementation = implementationFor();
      const backend = backendWith(implementation);

      await backend.listAllEntries(collectionWithI18n('multiple_folders'));

      const [, , , pathRegex, , siblingRegex] = implementation.allEntriesByFolder.mock.calls[0];
      expect(pathRegex.test('en/slug.md')).toBe(true);
      expect(siblingRegex.test('de/slug.md')).toBe(true);
      expect(siblingRegex.test('en/slug.md')).toBe(false);
    });

    it('passes no sibling selector when every locale lives in one file', async () => {
      const implementation = implementationFor();
      const backend = backendWith(implementation);

      await backend.listAllEntries(collectionWithI18n('single_file'));

      expect(implementation.allEntriesByFolder.mock.calls[0][5]).toBeUndefined();
    });

    it('passes no sibling selector for a collection without i18n', async () => {
      const implementation = implementationFor();
      const backend = backendWith(implementation);

      await backend.listAllEntries({
        name: 'posts',
        type: FOLDER,
        folder: 'content/posts',
        extension: 'md',
        fields: [],
      } as never);

      expect(implementation.allEntriesByFolder.mock.calls[0][5]).toBeUndefined();
    });

    it('passes the search term through', async () => {
      const implementation = implementationFor();
      const backend = backendWith(implementation);

      await backend.listAllEntries(collectionWithI18n('single_file'), 'cat');

      expect(implementation.allEntriesByFolder.mock.calls[0][4]).toBe('cat');
    });
  });

  describe('search and the entry body', () => {
    const collection = {
      name: 'posts',
      type: FOLDER,
      folder: 'posts',
      fields: [{ name: 'title', widget: 'string' }],
    } as never;
    const body = 'The cat sat on the mat. Lorem ipsum dolor sit amet, consectetur adipiscing elit, '
      + 'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
    const bodyPosts = [{ path: 'posts/hello.md', slug: 'hello', data: { title: 'Hello world', body } }];

    it('does not match the body on a backend that does not search it', async () => {
      const implementation: Record<string, unknown> = {};
      implementation.init = () => implementation;
      const backend = backendWith(implementation);
      backend.listAllEntries = vi.fn(() => Promise.resolve(bodyPosts)) as never;

      expect(await backend.search([collection], 'cat')).toEqual({ entries: [] });
    });

    it('matches the body on a backend that searches it server-side', async () => {
      const implementation: Record<string, unknown> = { searchesEntryBody: true };
      implementation.init = () => implementation;
      const backend = backendWith(implementation);
      backend.listAllEntries = vi.fn(() => Promise.resolve(bodyPosts)) as never;

      expect(await backend.search([collection], 'cat')).toEqual({ entries: bodyPosts });
    });

    it('hands only the free text to the backend', async () => {
      const implementation: Record<string, unknown> = {};
      implementation.init = () => implementation;
      const backend = backendWith(implementation);
      const listAllEntries = vi.fn(() => Promise.resolve([]));
      backend.listAllEntries = listAllEntries as never;

      await backend.search([collection], 'title:hello cat');
      await backend.search([collection], 'title:hello');

      expect(listAllEntries.mock.calls[0]).toEqual([collection, 'cat']);
      expect(listAllEntries.mock.calls[1]).toEqual([collection, undefined]);
    });
  });

  describe('init options', () => {
    it('hands the implementation the stored user as it is now', () => {
      let stored: Record<string, unknown> | null = { backendName: 'github', token: 'a' };
      const authStore = { retrieve: () => stored, store: vi.fn(), logout: vi.fn() };
      let options: { retrieveUserCredentials: () => unknown } | undefined;
      const implementation: Record<string, unknown> = {};
      implementation.init = (_config: unknown, opts: typeof options) => {
        options = opts;
        return implementation;
      };
      backendWith(implementation, authStore);

      expect(options!.retrieveUserCredentials()).toEqual({ backendName: 'github', token: 'a' });
      stored = { backendName: 'github', token: 'b' };
      expect(options!.retrieveUserCredentials()).toEqual({ backendName: 'github', token: 'b' });
      stored = { backendName: 'gitlab', token: 'c' };
      expect(options!.retrieveUserCredentials()).toBeNull();
    });

    it('relays onSessionInvalid to every subscriber until it unsubscribes', () => {
      let options: { onSessionInvalid: (message: string) => void } | undefined;
      const implementation: Record<string, unknown> = {};
      implementation.init = (_config: unknown, opts: typeof options) => {
        options = opts;
        return implementation;
      };
      const backend = backendWith(implementation);
      const listener = vi.fn();
      const unsubscribe = backend.onSessionInvalid(listener);

      options!.onSessionInvalid('gone');
      unsubscribe();
      options!.onSessionInvalid('again');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('gone');
    });
  });
});

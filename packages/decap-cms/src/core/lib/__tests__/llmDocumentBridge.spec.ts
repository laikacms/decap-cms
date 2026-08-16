import { describe, expect, it, vi } from 'vitest';

import { DRAFT_CHANGE_FIELD } from '@/core/actions/entries';
import { JsonPatchError } from '@/core/lib/jsonPatch';
import { createLlmDocumentBridge } from '@/core/lib/llmDocumentBridge';

import type { AppDispatch, RootState } from '@/core/redux';
import type { CmsCollectionState, CmsEntry } from '@/lib/util/index';

/**
 * The bridge is the only thing an `LlmTransport` can touch, so these pin the
 * blast radius: what a model can read, what it can write, and what happens
 * when it asks for something that is not there.
 */

const fields = [
  { name: 'title', widget: 'string' },
  { name: 'body', widget: 'richtext' },
  { name: 'tags', widget: 'list' },
];

function makeCollection(overrides: Partial<CmsCollectionState> = {}): CmsCollectionState {
  return {
    name: 'posts',
    type: 'folder_based_collection',
    folder: 'content/posts',
    fields,
    ...overrides,
  } as unknown as CmsCollectionState;
}

function makeEntry(overrides: Partial<CmsEntry> = {}): CmsEntry {
  return {
    slug: 'hello-world',
    collection: 'posts',
    data: { title: 'Hello', body: 'Body text', tags: ['a'] },
    ...overrides,
  } as unknown as CmsEntry;
}

function makeState(entry?: CmsEntry): RootState {
  return {
    entries: { entities: entry ? { 'posts.hello-world': entry } : {} },
    editorialWorkflow: { entities: {} },
  } as unknown as RootState;
}

function setup({
  collection = makeCollection(),
  entry = makeEntry(),
  locale,
  state = makeState(entry),
}: {
  collection?: CmsCollectionState,
  entry?: CmsEntry,
  locale?: string,
  state?: RootState,
} = {}) {
  const dispatch = vi.fn() as unknown as AppDispatch;
  const bridge = createLlmDocumentBridge({
    collection,
    getEntry: () => entry,
    ...(locale ? { locale } : {}),
    dispatch,
    getState: () => state,
  });
  return { bridge, dispatch: dispatch as unknown as ReturnType<typeof vi.fn> };
}

describe('createLlmDocumentBridge', () => {
  describe('context', () => {
    it('reports the collection and slug', () => {
      const { bridge } = setup();

      expect(bridge.context).toEqual({ collection: 'posts', slug: 'hello-world' });
    });

    it('includes the locale only when one is being edited', () => {
      expect(setup({ locale: 'nl' }).bridge.context).toEqual({
        collection: 'posts',
        slug: 'hello-world',
        locale: 'nl',
      });
    });

    it('reads the slug live, so a session opened on a new entry sees it once saved', () => {
      let entry = makeEntry({ slug: '' });
      const dispatch = vi.fn() as unknown as AppDispatch;
      const bridge = createLlmDocumentBridge({
        collection: makeCollection(),
        getEntry: () => entry,
        dispatch,
        getState: () => makeState(),
      });

      expect(bridge.context.slug).toBe('');
      entry = makeEntry({ slug: 'now-saved' });
      expect(bridge.context.slug).toBe('now-saved');
    });
  });

  describe('read', () => {
    it('returns the draft data', () => {
      expect(setup().bridge.read()).toEqual({
        title: 'Hello',
        body: 'Body text',
        tags: ['a'],
      });
    });

    it('returns an empty object when there is no entry', () => {
      const bridge = createLlmDocumentBridge({
        collection: makeCollection(),
        getEntry: () => undefined,
        dispatch: vi.fn() as unknown as AppDispatch,
        getState: () => makeState(),
      });

      expect(bridge.read()).toEqual({});
    });

    it('returns the localized data when editing a non-default locale', () => {
      const collection = makeCollection({
        i18n: { structure: 'multiple_folders', locales: ['en', 'nl'], default_locale: 'en' },
      } as Partial<CmsCollectionState>);
      const entry = makeEntry({
        i18n: { nl: { data: { title: 'Hallo' } } },
      } as Partial<CmsEntry>);

      expect(setup({ collection, entry, locale: 'nl' }).bridge.read()).toEqual({ title: 'Hallo' });
    });

    it('falls back to the default locale for an untranslated locale', () => {
      const collection = makeCollection({
        i18n: { structure: 'multiple_folders', locales: ['en', 'nl'], default_locale: 'en' },
      } as Partial<CmsCollectionState>);

      expect(setup({ collection, locale: 'nl' }).bridge.read()).toEqual({
        title: 'Hello',
        body: 'Body text',
        tags: ['a'],
      });
    });
  });

  describe('fields', () => {
    it('exposes the collection field definitions', () => {
      expect(setup().bridge.fields().map(field => field.name)).toEqual(['title', 'body', 'tags']);
    });
  });

  describe('applyPatch', () => {
    it('dispatches changeDraftField for a patched field and reports it', () => {
      const { bridge, dispatch } = setup();

      const result = bridge.applyPatch([{ op: 'replace', path: '/title', value: 'Goodbye' }]);

      expect(result).toEqual({ changed: ['title'] });
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: DRAFT_CHANGE_FIELD,
          payload: expect.objectContaining({
            field: { name: 'title', widget: 'string' },
            value: 'Goodbye',
          }),
        }),
      );
    });

    it('dispatches only for fields an operation addressed', () => {
      const { bridge, dispatch } = setup();

      const result = bridge.applyPatch([{ op: 'add', path: '/tags/-', value: 'b' }]);

      // Re-dispatching every field would mark the whole entry dirty.
      expect(result).toEqual({ changed: ['tags'] });
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ value: ['a', 'b'] }),
        }),
      );
    });

    it('dispatches once per field for a multi-field patch', () => {
      const { bridge, dispatch } = setup();

      const result = bridge.applyPatch([
        { op: 'replace', path: '/title', value: 'New' },
        { op: 'replace', path: '/body', value: 'New body' },
      ]);

      expect(result).toEqual({ changed: ['title', 'body'] });
      expect(dispatch).toHaveBeenCalledTimes(2);
    });

    it('skips a field the collection does not define instead of throwing', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { bridge, dispatch } = setup();

      const result = bridge.applyPatch([
        { op: 'add', path: '/hallucinated', value: 'x' },
        { op: 'replace', path: '/title', value: 'New' },
      ]);

      // A model can invent a field name; the rest of the patch still lands.
      expect(result).toEqual({ changed: ['title'] });
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('hallucinated'));

      consoleWarn.mockRestore();
    });

    it('passes the i18n context when editing a locale', () => {
      const collection = makeCollection({
        i18n: { structure: 'multiple_folders', locales: ['en', 'nl'], default_locale: 'en' },
      } as Partial<CmsCollectionState>);
      const { bridge, dispatch } = setup({ collection, locale: 'nl' });

      bridge.applyPatch([{ op: 'replace', path: '/title', value: 'Hallo' }]);

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            i18n: { currentLocale: 'nl', defaultLocale: 'en', locales: ['en', 'nl'] },
          }),
        }),
      );
    });

    it('passes the cached originals so hasChanged stays accurate', () => {
      const original = makeEntry();
      const { bridge, dispatch } = setup({ state: makeState(original) });

      bridge.applyPatch([{ op: 'replace', path: '/title', value: 'New' }]);

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: expect.objectContaining({ entries: [original] }) }),
      );
    });

    it('throws and dispatches nothing when an operation is inapplicable', () => {
      const { bridge, dispatch } = setup();

      expect(() => bridge.applyPatch([{ op: 'replace', path: '/missing', value: 'x' }])).toThrow(
        JsonPatchError,
      );
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('does not mutate the entry data in place', () => {
      const entry = makeEntry();
      const before = structuredClone(entry.data);
      const { bridge } = setup({ entry });

      bridge.applyPatch([{ op: 'replace', path: '/title', value: 'Changed' }]);

      // The reducer diffs by reference; an in-place write would hide the change.
      expect(entry.data).toEqual(before);
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DRAFT_CHANGE_FIELD, DRAFT_FIELDS_EXTERNALLY_CHANGED } from '@/core/actions/entries';
import { FOLDER } from '@/core/constants/collectionTypes';
import editorialWorkflowReducer from '@/core/reducers/editorialWorkflow';
import entriesReducer from '@/core/reducers/entries';
import entryDraftReducer from '@/core/reducers/entryDraft';

/**
 * CMS.editor: reading the open entry and patching its fields from outside
 * React. A fake store runs the real entryDraft reducer, so each test sees the
 * draft exactly as the editor would after the patch.
 */

const mockStore = vi.hoisted(() => ({
  state: {} as Record<string, any>,
  dispatched: [] as { type: string, payload?: unknown }[],
  reduce: null as null | ((state: unknown, action: unknown) => unknown),
}));

vi.mock('@/core/redux', () => ({
  store: {
    getState: () => mockStore.state,
    dispatch: (action: { type: string }) => {
      mockStore.dispatched.push(action);
      mockStore.state = { ...mockStore.state, entryDraft: mockStore.reduce!(mockStore.state.entryDraft, action) };
      return action;
    },
    subscribe: vi.fn(() => () => undefined),
  },
}));

const { applyFieldPatch, getCurrentEntry } = await import('@/core/lib/editorApi');
mockStore.reduce = entryDraftReducer as never;

const posts = {
  name: 'posts',
  label: 'Posts',
  type: FOLDER,
  folder: 'content/posts',
  fields: [
    { name: 'title', widget: 'string' },
    { name: 'draft', widget: 'boolean' },
    { name: 'tags', widget: 'list' },
    { name: 'seo', widget: 'object', fields: [{ name: 'description', widget: 'text' }] },
    { name: 'body', widget: 'richtext' },
    { name: 'secret', widget: 'hidden' },
  ],
};

const pages = {
  ...posts,
  name: 'pages',
  // As normalizeConfig leaves it: default_locale, and per-field translate/none.
  i18n: { structure: 'multiple_folders', locales: ['en', 'de'], default_locale: 'en' },
  fields: [
    { name: 'title', widget: 'string', i18n: 'translate' },
    { name: 'layout', widget: 'string', i18n: 'none' },
  ],
};

function openEntry(collection = 'posts', data: Record<string, unknown> = {}) {
  mockStore.dispatched = [];
  mockStore.state = {
    collections: { posts, pages },
    entries: entriesReducer(undefined, { type: '@@init' }),
    editorialWorkflow: editorialWorkflowReducer(undefined, { type: '@@init' }),
    entryDraft: {
      entry: {
        collection,
        slug: 'hello',
        path: `content/${collection}/hello.md`,
        newRecord: false,
        data: {
          title: 'Hello',
          draft: false,
          tags: ['a', 'b'],
          seo: { description: 'Old' },
          body: 'Body',
          ...data,
        },
        ...(collection === 'pages' ? { i18n: { de: { data: { title: 'Hallo' } } } } : {}),
      },
      fieldsMetaData: {},
      fieldsErrors: {},
      hasChanged: false,
      key: 'k',
    },
  };
}

function draft() {
  return mockStore.state.entryDraft;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('getCurrentEntry', () => {
  it('returns null when no entry is open', () => {
    openEntry();
    mockStore.state.entryDraft = { entry: {} };
    expect(getCurrentEntry()).toBeNull();
  });

  it('returns plain values: fields, data and identity', () => {
    openEntry();
    const snapshot = getCurrentEntry()!;
    expect(snapshot).toMatchObject({
      collection: 'posts',
      collectionLabel: 'Posts',
      slug: 'hello',
      newRecord: false,
      data: { title: 'Hello', tags: ['a', 'b'] },
      locales: null,
      hasChanged: false,
    });
    expect(snapshot.fields.map(f => f.name)).toContain('seo');
  });

  it('hands out copies, not the draft itself', () => {
    openEntry();
    const snapshot = getCurrentEntry()!;
    (snapshot.data.tags as string[]).push('mutated');
    expect(draft().entry.data.tags).toEqual(['a', 'b']);
  });
});

describe('applyFieldPatch', () => {
  it('sets top-level fields through changeDraftField and marks the draft changed', () => {
    openEntry();
    const result = applyFieldPatch([
      { path: 'title', value: 'New title' },
      { path: 'body', value: '# Heading' },
    ]);
    expect(result).toEqual({ applied: ['title', 'body'], rejected: [] });
    expect(draft().entry.data).toMatchObject({ title: 'New title', body: '# Heading' });
    expect(draft().hasChanged).toBe(true);
    expect(mockStore.dispatched.filter(a => a.type === DRAFT_CHANGE_FIELD)).toHaveLength(2);
  });

  it('sets nested values inside objects and lists', () => {
    openEntry();
    applyFieldPatch([
      { path: 'seo.description', value: 'New description' },
      { path: 'tags.1', value: 'changed' },
      { path: 'tags.2', value: 'added' },
    ]);
    expect(draft().entry.data).toMatchObject({
      seo: { description: 'New description' },
      tags: ['a', 'changed', 'added'],
    });
  });

  it('refuses unknown fields, hidden fields and wrong types, applying the rest', () => {
    openEntry();
    const result = applyFieldPatch([
      { path: 'nope', value: 'x' },
      { path: 'secret', value: 'x' },
      { path: 'title', value: 42 },
      { path: 'draft', value: 'yes' },
      { path: 'tags', value: 'not a list' },
      { path: 'title.inner', value: 'x' },
      { path: 'draft', value: true },
    ]);
    expect(result.applied).toEqual(['draft']);
    expect(result.rejected.map(r => r.path)).toEqual(['nope', 'secret', 'title', 'draft', 'tags', 'title.inner']);
    expect(draft().entry.data).toMatchObject({ title: 'Hello', draft: true });
  });

  it('remounts and highlights the touched fields, then clears the highlight', () => {
    openEntry();
    applyFieldPatch([
      { path: 'body', value: 'x' },
      { path: 'seo.description', value: 'y' },
    ]);
    expect(draft().fieldRevisions).toEqual({ body: 1, seo: 1 });
    expect(draft().fieldHighlights).toEqual({ body: true, seo: true });
    expect(mockStore.dispatched.some(a => a.type === DRAFT_FIELDS_EXTERNALLY_CHANGED)).toBe(true);

    vi.runAllTimers();
    expect(draft().fieldHighlights).toEqual({});
    expect(draft().fieldRevisions).toEqual({ body: 1, seo: 1 });
  });

  it('writes another locale of an i18n collection, and only translatable fields', () => {
    openEntry('pages');
    const result = applyFieldPatch(
      [
        { path: 'title', value: 'Neuer Titel' },
        { path: 'layout', value: 'wide' },
      ],
      { locale: 'de' },
    );
    expect(result.applied).toEqual(['title']);
    expect(result.rejected[0]).toMatchObject({ path: 'layout' });
    expect(draft().entry.i18n.de.data.title).toBe('Neuer Titel');
    expect(draft().entry.data.title).toBe('Hello');
  });

  it('refuses a locale the collection does not have', () => {
    openEntry('pages');
    expect(applyFieldPatch([{ path: 'title', value: 'x' }], { locale: 'fr' }).rejected).toHaveLength(1);
  });

  it('refuses everything when no entry is open', () => {
    openEntry();
    mockStore.state.entryDraft = { entry: {} };
    expect(applyFieldPatch([{ path: 'title', value: 'x' }])).toEqual({
      applied: [],
      rejected: [{ path: 'title', reason: 'no entry is open' }],
    });
  });
});

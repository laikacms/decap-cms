import { describe, expect, it } from 'vitest';

import { FOLDER } from '@/core/constants/collectionTypes';
import { clearReferencesOnEntry, findCascadeDeleteReferences } from '@/core/lib/cascadeDeleteRelations';

import type { CmsEntry } from '@/lib/util/index';

function makeCollectionState(name: string, fields: Record<string, unknown>[]): Record<string, unknown> {
  return {
    name,
    type: FOLDER,
    folder: `_${name}`,
    fields,
  };
}

function makeEntry(collection: string, slug: string, data: Record<string, unknown>): CmsEntry {
  return {
    path: `_${collection}/${slug}.md`,
    slug,
    data,
    collection,
    mediaFiles: [],
    meta: {},
  } as CmsEntry;
}

describe('findCascadeDeleteReferences', () => {
  const collections = {
    authors: makeCollectionState('authors', [
      { name: 'name', label: 'Name', widget: 'string' },
      { name: 'slug', label: 'Slug', widget: 'string' },
    ]),
    posts: makeCollectionState('posts', [
      { name: 'title', label: 'Title', widget: 'string' },
      {
        name: 'author',
        label: 'Author',
        widget: 'relation',
        collection: 'authors',
        value_field: 'slug',
      },
      {
        name: 'contributors',
        label: 'Contributors',
        widget: 'relation',
        collection: 'authors',
        value_field: 'slug',
        multiple: true,
      },
    ]),
  } as never;

  function entriesByCollection(name: string): CmsEntry[] {
    if (name === 'posts') {
      return [
        makeEntry('posts', 'post-a', { title: 'A', author: 'jane', contributors: ['jane', 'bob'] }),
        makeEntry('posts', 'post-b', { title: 'B', author: 'bob', contributors: ['bob'] }),
      ];
    }
    return [];
  }

  it('finds a single-value relation field referencing the deleted entry', () => {
    const deletedEntry = makeEntry('authors', 'author-jane', { name: 'Jane', slug: 'jane' });

    const references = findCascadeDeleteReferences(collections, 'authors', deletedEntry, entriesByCollection);

    const authorRefs = references.filter(r => r.field.name === 'author');
    expect(authorRefs).toHaveLength(1);
    expect(authorRefs[0].entry.slug).toBe('post-a');
    expect(authorRefs[0].deletedValue).toBe('jane');
  });

  it('finds a multiple-value relation field referencing the deleted entry', () => {
    const deletedEntry = makeEntry('authors', 'author-jane', { name: 'Jane', slug: 'jane' });

    const references = findCascadeDeleteReferences(collections, 'authors', deletedEntry, entriesByCollection);

    const contributorRefs = references.filter(r => r.field.name === 'contributors');
    expect(contributorRefs).toHaveLength(1);
    expect(contributorRefs[0].entry.slug).toBe('post-a');
  });

  it('returns no references when nothing points at the deleted entry', () => {
    const deletedEntry = makeEntry('authors', 'author-nobody', { name: 'Nobody', slug: 'nobody' });

    const references = findCascadeDeleteReferences(collections, 'authors', deletedEntry, entriesByCollection);

    expect(references).toEqual([]);
  });

  it('ignores relation fields pointing at a different collection', () => {
    const otherCollections = {
      ...collections,
      posts: makeCollectionState('posts', [
        { name: 'title', label: 'Title', widget: 'string' },
        { name: 'category', widget: 'relation', collection: 'categories', value_field: 'slug' },
      ]),
    } as never;
    const deletedEntry = makeEntry('authors', 'author-jane', { name: 'Jane', slug: 'jane' });

    const references = findCascadeDeleteReferences(
      otherCollections,
      'authors',
      deletedEntry,
      entriesByCollection,
    );

    expect(references).toEqual([]);
  });

  it('ignores relation fields with a templated value_field', () => {
    const templatedCollections = {
      authors: collections.authors,
      posts: makeCollectionState('posts', [
        {
          name: 'author',
          widget: 'relation',
          collection: 'authors',
          value_field: '{{slug}}',
        },
      ]),
    } as never;
    const deletedEntry = makeEntry('authors', 'author-jane', { name: 'Jane', slug: 'jane' });

    const references = findCascadeDeleteReferences(
      templatedCollections,
      'authors',
      deletedEntry,
      entriesByCollection,
    );

    expect(references).toEqual([]);
  });
});

describe('clearReferencesOnEntry', () => {
  it('clears a single-value field to undefined', () => {
    const entry = makeEntry('posts', 'post-a', { title: 'A', author: 'jane' });
    const field = { name: 'author', widget: 'relation', collection: 'authors', value_field: 'slug' } as never;
    const references = [{ collectionName: 'posts', entry, field, deletedValue: 'jane' }];

    const updated = clearReferencesOnEntry(entry, references as never);

    expect((updated.data as Record<string, unknown>).author).toBeUndefined();
    expect((updated.data as Record<string, unknown>).title).toBe('A');
  });

  it('removes only the matching value from a multiple field', () => {
    const entry = makeEntry('posts', 'post-a', { title: 'A', contributors: ['jane', 'bob'] });
    const field = {
      name: 'contributors',
      widget: 'relation',
      collection: 'authors',
      value_field: 'slug',
      multiple: true,
    } as never;
    const references = [{ collectionName: 'posts', entry, field, deletedValue: 'jane' }];

    const updated = clearReferencesOnEntry(entry, references as never);

    expect((updated.data as Record<string, unknown>).contributors).toEqual(['bob']);
  });

  it('leaves entries unaffected when references target a different entry', () => {
    const entry = makeEntry('posts', 'post-a', { title: 'A', author: 'jane' });
    const otherEntry = makeEntry('posts', 'post-b', { title: 'B', author: 'jane' });
    const field = { name: 'author', widget: 'relation', collection: 'authors', value_field: 'slug' } as never;
    const references = [{ collectionName: 'posts', entry: otherEntry, field, deletedValue: 'jane' }];

    const updated = clearReferencesOnEntry(entry, references as never);

    expect(updated.data).toEqual(entry.data);
  });
});

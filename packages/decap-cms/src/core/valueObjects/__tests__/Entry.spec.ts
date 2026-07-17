import { describe, expect, it } from 'vitest';

import { createEntry } from '@/core/valueObjects/Entry';

describe('createEntry', () => {
  it('defaults all optional fields when options is omitted', () => {
    expect(createEntry('posts')).toEqual({
      collection: 'posts',
      slug: '',
      path: '',
      partial: false,
      raw: '',
      data: {},
      label: null,
      isModification: null,
      mediaFiles: [],
      author: '',
      updatedOn: '',
      status: '',
      meta: {},
      i18n: {},
    });
  });

  it('uses the provided slug and path when given', () => {
    const entry = createEntry('posts', 'my-slug', 'content/posts/my-slug.md');

    expect(entry.slug).toEqual('my-slug');
    expect(entry.path).toEqual('content/posts/my-slug.md');
  });

  it('overrides partial when explicitly set', () => {
    expect(createEntry('posts', '', '', { partial: true }).partial).toBe(true);
    expect(createEntry('posts', '', '', { partial: false }).partial).toBe(false);
  });

  it('overrides raw when provided', () => {
    expect(createEntry('posts', '', '', { raw: 'title: Hello' }).raw).toEqual('title: Hello');
  });

  it('overrides data when provided', () => {
    const data = { title: 'Hello' };
    expect(createEntry('posts', '', '', { data }).data).toBe(data);
  });

  it('overrides label when provided', () => {
    expect(createEntry('posts', '', '', { label: 'My Label' }).label).toEqual('My Label');
  });

  it('overrides author when provided', () => {
    expect(createEntry('posts', '', '', { author: 'jane' }).author).toEqual('jane');
  });

  it('overrides updatedOn when provided', () => {
    expect(createEntry('posts', '', '', { updatedOn: '2026-01-01' }).updatedOn).toEqual(
      '2026-01-01',
    );
  });

  it('overrides status when provided', () => {
    expect(createEntry('posts', '', '', { status: 'draft' }).status).toEqual('draft');
  });

  describe('isModification tri-state', () => {
    it('defaults to null when omitted', () => {
      expect(createEntry('posts').isModification).toBeNull();
    });

    it('preserves true', () => {
      expect(createEntry('posts', '', '', { isModification: true }).isModification).toBe(true);
    });

    it('preserves false', () => {
      expect(createEntry('posts', '', '', { isModification: false }).isModification).toBe(false);
    });

    it('falls back to null when explicitly passed null', () => {
      expect(createEntry('posts', '', '', { isModification: null }).isModification).toBeNull();
    });
  });

  describe('mediaFiles default', () => {
    it('defaults to an empty array when omitted', () => {
      expect(createEntry('posts').mediaFiles).toEqual([]);
    });

    it('defaults to an empty array when explicitly null', () => {
      expect(createEntry('posts', '', '', { mediaFiles: null }).mediaFiles).toEqual([]);
    });

    it('preserves a provided mediaFiles array', () => {
      const mediaFiles = [{ id: '1', name: 'foo.png', size: 1, path: '/foo.png' }];
      expect(createEntry('posts', '', '', { mediaFiles }).mediaFiles).toBe(mediaFiles);
    });
  });

  describe('meta default', () => {
    it('defaults to an empty object when omitted', () => {
      expect(createEntry('posts').meta).toEqual({});
    });

    it('preserves a provided meta object', () => {
      const meta = { path: 'content/posts/my-slug.md' };
      expect(createEntry('posts', '', '', { meta }).meta).toBe(meta);
    });
  });

  describe('i18n default', () => {
    it('defaults to an empty object when omitted', () => {
      expect(createEntry('posts').i18n).toEqual({});
    });

    it('preserves a provided i18n object', () => {
      const i18n = { en: { title: 'Hello' }, fr: { title: 'Bonjour' } };
      expect(createEntry('posts', '', '', { i18n }).i18n).toBe(i18n);
    });
  });
});

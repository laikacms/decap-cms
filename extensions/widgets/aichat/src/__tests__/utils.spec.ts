import { describe, expect, it } from 'vitest';

import { getI18nInfo, hasI18n, selectFields } from '../utils';

import type { CmsCollectionState, CmsEntryField } from '@laikacms/decap-cms/lib/util';

describe('aichat widget utils', () => {
  describe('hasI18n', () => {
    it('returns true when collection.i18n is set', () => {
      const collection = {
        name: 'posts',
        i18n: { structure: 'multiple_folders', locales: ['en', 'nl'], default_locale: 'en' },
      } as unknown as CmsCollectionState;
      expect(hasI18n(collection)).toBe(true);
    });

    it('returns false when collection.i18n is not set', () => {
      const collection = { name: 'posts' } as unknown as CmsCollectionState;
      expect(hasI18n(collection)).toBe(false);
    });
  });

  describe('getI18nInfo', () => {
    it('returns structure/locales/defaultLocale when i18n is present', () => {
      const collection = {
        name: 'posts',
        i18n: { structure: 'multiple_folders', locales: ['en', 'nl', 'de'], default_locale: 'en' },
      } as unknown as CmsCollectionState;

      expect(getI18nInfo(collection)).toEqual({
        structure: 'multiple_folders',
        locales: ['en', 'nl', 'de'],
        defaultLocale: 'en',
      });
    });

    it('returns undefined when i18n is not present', () => {
      const collection = { name: 'posts' } as unknown as CmsCollectionState;
      expect(getI18nInfo(collection)).toBeUndefined();
    });
  });

  describe('selectFields', () => {
    const fileFields = [{ name: 'title', widget: 'string' }] as unknown as CmsEntryField[];
    const folderFields = [{ name: 'body', widget: 'markdown' }] as unknown as CmsEntryField[];

    it('returns the matching file fields for a file_based_collection', () => {
      const collection = {
        name: 'pages',
        type: 'file_based_collection',
        files: [
          { file: 'content/about.md', name: 'about', fields: fileFields, label: 'About' },
          { file: 'content/home.md', name: 'home', fields: folderFields, label: 'Home' },
        ],
      } as unknown as CmsCollectionState;

      expect(selectFields(collection, 'about')).toBe(fileFields);
    });

    it('returns undefined for a file_based_collection when the slug has no matching file', () => {
      const collection = {
        name: 'pages',
        type: 'file_based_collection',
        files: [
          { file: 'content/about.md', name: 'about', fields: fileFields, label: 'About' },
        ],
      } as unknown as CmsCollectionState;

      expect(selectFields(collection, 'missing')).toBeUndefined();
    });

    it('returns collection.fields for a folder_based_collection', () => {
      const collection = {
        name: 'posts',
        type: 'folder_based_collection',
        fields: folderFields,
      } as unknown as CmsCollectionState;

      expect(selectFields(collection, 'any-slug')).toBe(folderFields);
    });
  });
});

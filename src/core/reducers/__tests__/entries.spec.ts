import { describe, expect, it } from 'vitest';

import { Cursor } from '../../../lib/util/index';
import * as actions from '../../actions/entries';
import reducer, {
  selectMediaFolder,
  selectMediaFilePath,
  selectMediaFilePublicPath,
  selectEntries,
} from '../entries';

const initialState = {
  entities: {},
  pages: {},
};

describe('entries', () => {
  describe('reducer', () => {
    it('should mark entries as fetching', () => {
      expect(reducer(initialState, actions.entriesLoading({ name: 'posts' }))).toEqual(
        expect.objectContaining({
          entities: {},
          pages: {
            posts: { isFetching: true, ids: [], page: 0 },
          },
        }),
      );
    });

    it('should handle loaded entries', () => {
      const entries = [
        { slug: 'a', path: '' },
        { slug: 'b', title: 'B' },
      ];
      expect(
        reducer(
          initialState,
          actions.entriesLoaded({ name: 'posts' }, entries, 0, Cursor.create({})),
        ),
      ).toEqual(
        expect.objectContaining({
          entities: {
            'posts.a': { slug: 'a', path: '', isFetching: false },
            'posts.b': { slug: 'b', title: 'B', isFetching: false },
          },
          pages: {
            posts: {
              page: 0,
              ids: ['a', 'b'],
              isFetching: false,
            },
          },
        }),
      );
    });

    it('should handle loaded entry', () => {
      const entry = { slug: 'a', path: '' };
      expect(reducer(initialState, actions.entryLoaded({ name: 'posts' }, entry))).toEqual(
        expect.objectContaining({
          entities: {
            'posts.a': { slug: 'a', path: '', isFetching: false },
          },
          pages: {
            posts: {
              ids: ['a'],
              isFetching: false,
              page: 0,
            },
          },
        }),
      );
    });
  });

  describe('selectMediaFolder', () => {
    it("should return global media folder when collection doesn't specify media_folder", () => {
      expect(
        selectMediaFolder(
          { media_folder: 'static/media' },
          { name: 'posts' },
          undefined,
          undefined,
        ),
      ).toEqual('static/media');
    });

    it('should return collection folder when collection specifies media_folder and entry is undefined', () => {
      expect(
        selectMediaFolder(
          { media_folder: 'static/media' },
          { name: 'posts', folder: 'posts', media_folder: '' },
          undefined,
          undefined,
        ),
      ).toEqual('posts');
    });

    it('should return relative media folder when collection specifies media_folder and entry path is not null', () => {
      expect(
        selectMediaFolder(
          { media_folder: 'static/media' },
          { name: 'posts', folder: 'posts', media_folder: '' },
          { path: 'posts/title/index.md' },
          undefined,
        ),
      ).toEqual('posts/title');
    });

    it('should resolve collection relative media folder', () => {
      expect(
        selectMediaFolder(
          { media_folder: 'static/media' },
          { name: 'posts', folder: 'posts', media_folder: '../' },
          { path: 'posts/title/index.md' },
          undefined,
        ),
      ).toEqual('posts');
    });

    it('should resolve field relative media folder', () => {
      const field = { media_folder: '' };
      expect(
        selectMediaFolder(
          { media_folder: '/static/img' },
          {
            name: 'other',
            folder: 'other',
            fields: [field],
            media_folder: '../',
          },
          { path: 'src/other/other.md', data: {} },
          field,
        ),
      ).toEqual('src/other');
    });

    it('should return collection absolute media folder without leading slash', () => {
      expect(
        selectMediaFolder(
          { media_folder: '/static/Images' },
          {
            name: 'getting-started',
            folder: 'src/docs/getting-started',
            media_folder: '/static/images/docs/getting-started',
          },
          {},
          undefined,
        ),
      ).toEqual('static/images/docs/getting-started');
    });

    it('should compile relative media folder template', () => {
      const slugConfig = {
        encoding: 'unicode',
        clean_accents: false,
        sanitize_replacement: '-',
      };

      const entry = {
        path: 'content/en/hosting-and-deployment/deployment-with-nanobox.md',
        data: { title: 'Deployment With NanoBox', category: 'Hosting And Deployment' },
      };
      const collection = {
        name: 'posts',
        folder: 'content',
        media_folder: '../../../{{media_folder}}/{{category}}/{{slug}}',
        fields: [{ name: 'title', widget: 'string' }],
      };

      expect(
        selectMediaFolder(
          { media_folder: 'static/media', slug: slugConfig },
          collection,
          entry,
          undefined,
        ),
      ).toEqual('static/media/hosting-and-deployment/deployment-with-nanobox');
    });

    it('should compile absolute media folder template', () => {
      const slugConfig = {
        encoding: 'unicode',
        clean_accents: false,
        sanitize_replacement: '-',
      };

      const entry = {
        data: { title: 'Overview' },
      };
      const collection = {
        name: 'extending',
        folder: 'src/docs/extending',
        media_folder: '{{media_folder}}/docs/extending',
        fields: [{ name: 'title', widget: 'string' }],
      };

      expect(
        selectMediaFolder(
          { media_folder: '/static/images', slug: slugConfig },
          collection,
          entry,
          undefined,
        ),
      ).toEqual('static/images/docs/extending');
    });

    it('should compile field media folder template', () => {
      const slugConfig = {
        encoding: 'unicode',
        clean_accents: false,
        sanitize_replacement: '-',
      };

      const entry = {
        path: 'content/en/hosting-and-deployment/deployment-with-nanobox.md',
        data: { title: 'Deployment With NanoBox', category: 'Hosting And Deployment' },
      };
      const collection = {
        name: 'posts',
        folder: 'content',
        fields: [
          {
            name: 'title',
            widget: 'string',
            media_folder: '../../../{{media_folder}}/{{category}}/{{slug}}',
          },
        ],
      };

      expect(
        selectMediaFolder(
          { media_folder: 'static/media', slug: slugConfig },
          collection,
          entry,
          collection.fields[0],
        ),
      ).toEqual('static/media/hosting-and-deployment/deployment-with-nanobox');
    });

    it('should handle double slashes', () => {
      const slugConfig = {
        encoding: 'unicode',
        clean_accents: false,
        sanitize_replacement: '-',
      };

      const entry = {
        path: 'content/en/hosting-and-deployment/deployment-with-nanobox.md',
        data: { title: 'Deployment With NanoBox', category: 'Hosting And Deployment' },
      };

      const collection = {
        name: 'posts',
        folder: 'content',
        media_folder: '{{media_folder}}/blog',
        fields: [{ name: 'title', widget: 'string' }],
      };

      expect(
        selectMediaFolder(
          { media_folder: '/static/img/', slug: slugConfig },
          collection,
          entry,
          undefined,
        ),
      ).toEqual('static/img/blog');

      expect(
        selectMediaFolder(
          { media_folder: 'static/img/', slug: slugConfig },
          collection,
          entry,
          undefined,
        ),
      ).toEqual('content/en/hosting-and-deployment/static/img/blog');
    });

    it('should handle file media_folder', () => {
      expect(
        selectMediaFolder(
          { media_folder: 'static/media' },
          { name: 'posts', files: [{ name: 'index', media_folder: '/static/images/' }] },
          { path: 'posts/title/index.md', slug: 'index' },
          undefined,
        ),
      ).toBe('static/images');
    });

    it('should cascade media_folders', () => {
      const mainImageField = { name: 'main_image' };
      const logoField = { name: 'logo', media_folder: '{{media_folder}}/logos/' };
      const nestedField3 = { name: 'nested', media_folder: '{{media_folder}}/nested3/' };
      const nestedField2 = {
        name: 'nested',
        media_folder: '{{media_folder}}/nested2/',
        types: [nestedField3],
      };
      const nestedField1 = {
        name: 'nested',
        media_folder: '{{media_folder}}/nested1/',
        fields: [nestedField2],
      };

      const args = [
        { media_folder: '/static/img' },
        {
          name: 'general',
          media_folder: '{{media_folder}}/general/',
          files: [
            {
              name: 'customers',
              media_folder: '{{media_folder}}/customers/',
              fields: [
                mainImageField,
                logoField,
                { media_folder: '{{media_folder}}/nested', field: nestedField1 },
              ],
            },
          ],
        },
        { path: 'src/customers/customers.md', slug: 'customers', data: { title: 'title' } },
      ];

      expect(selectMediaFolder(...args, mainImageField)).toBe('static/img/general/customers');
      expect(selectMediaFolder(...args, logoField)).toBe('static/img/general/customers/logos');
      expect(selectMediaFolder(...args, nestedField1)).toBe(
        'static/img/general/customers/nested/nested1',
      );
      expect(selectMediaFolder(...args, nestedField2)).toBe(
        'static/img/general/customers/nested/nested1/nested2',
      );
      expect(selectMediaFolder(...args, nestedField3)).toBe(
        'static/img/general/customers/nested/nested1/nested2/nested3',
      );
    });
  });

  describe('selectMediaFilePath', () => {
    it('should return absolute URL as is', () => {
      expect(selectMediaFilePath(null, null, null, 'https://www.netlify.com/image.png')).toBe(
        'https://www.netlify.com/image.png',
      );
    });

    it('should resolve path from global media folder for collection with no media folder', () => {
      expect(
        selectMediaFilePath(
          { media_folder: 'static/media' },
          { name: 'posts', folder: 'posts' },
          undefined,
          'image.png',
          undefined,
        ),
      ).toBe('static/media/image.png');
    });

    it('should resolve path from collection media folder for collection with media folder', () => {
      expect(
        selectMediaFilePath(
          { media_folder: 'static/media' },
          { name: 'posts', folder: 'posts', media_folder: '' },
          undefined,
          'image.png',
          undefined,
        ),
      ).toBe('posts/image.png');
    });

    it('should handle relative media_folder', () => {
      expect(
        selectMediaFilePath(
          { media_folder: 'static/media' },
          { name: 'posts', folder: 'posts', media_folder: '../../static/media/' },
          { path: 'posts/title/index.md' },
          'image.png',
          undefined,
        ),
      ).toBe('static/media/image.png');
    });

    it('should handle field media_folder', () => {
      const field = { media_folder: '../../static/media/' };
      expect(
        selectMediaFilePath(
          { media_folder: 'static/media' },
          { name: 'posts', folder: 'posts', fields: [field] },
          { path: 'posts/title/index.md' },
          'image.png',
          field,
        ),
      ).toBe('static/media/image.png');
    });
  });

  describe('selectMediaFilePublicPath', () => {
    it('should return absolute URL as is', () => {
      expect(selectMediaFilePublicPath(null, null, 'https://www.netlify.com/image.png')).toBe(
        'https://www.netlify.com/image.png',
      );
    });

    it('should resolve path from public folder for collection with no media folder', () => {
      expect(
        selectMediaFilePublicPath(
          { public_folder: '/media' },
          null,
          '/media/image.png',
          undefined,
          undefined,
        ),
      ).toBe('/media/image.png');
    });

    it('should resolve path from collection public folder for collection with public folder', () => {
      expect(
        selectMediaFilePublicPath(
          { public_folder: '/media' },
          { name: 'posts', folder: 'posts', public_folder: '' },
          'image.png',
          undefined,
          undefined,
        ),
      ).toBe('image.png');
    });

    it('should handle relative public_folder', () => {
      expect(
        selectMediaFilePublicPath(
          { public_folder: '/media' },
          { name: 'posts', folder: 'posts', public_folder: '../../static/media/' },
          'image.png',
          undefined,
          undefined,
        ),
      ).toBe('../../static/media/image.png');
    });

    it('should handle absolute public_folder', () => {
      expect(
        selectMediaFilePublicPath(
          { public_folder: 'https://www.netlify.com/media' },
          {
            name: 'posts',
            folder: 'posts',
            public_folder: 'https://www.netlify.com/media',
          },
          'image.png',
          undefined,
          undefined,
        ),
      ).toBe('https://www.netlify.com/media/image.png');
    });

    it('should compile collection public folder template', () => {
      const slugConfig = {
        encoding: 'unicode',
        clean_accents: false,
        sanitize_replacement: '-',
      };

      const entry = {
        path: 'content/en/hosting-and-deployment/deployment-with-nanobox.md',
        data: { title: 'Deployment With NanoBox', category: 'Hosting And Deployment' },
      };
      const collection = {
        name: 'posts',
        folder: 'content',
        public_folder: '/{{public_folder}}/{{category}}/{{slug}}',
        fields: [{ name: 'title', widget: 'string' }],
      };

      expect(
        selectMediaFilePublicPath(
          { public_folder: 'static/media', slug: slugConfig },
          collection,
          'image.png',
          entry,
          undefined,
        ),
      ).toEqual('/static/media/hosting-and-deployment/deployment-with-nanobox/image.png');
    });

    it('should compile field public folder template', () => {
      const slugConfig = {
        encoding: 'unicode',
        clean_accents: false,
        sanitize_replacement: '-',
      };

      const entry = {
        path: 'content/en/hosting-and-deployment/deployment-with-nanobox.md',
        data: { title: 'Deployment With NanoBox', category: 'Hosting And Deployment' },
      };

      const field = {
        name: 'title',
        widget: 'string',
        public_folder: '/{{public_folder}}/{{category}}/{{slug}}',
      };
      const collection = {
        name: 'posts',
        folder: 'content',
        fields: [field],
      };

      expect(
        selectMediaFilePublicPath(
          { public_folder: 'static/media', slug: slugConfig },
          collection,
          'image.png',
          entry,
          field,
        ),
      ).toEqual('/static/media/hosting-and-deployment/deployment-with-nanobox/image.png');
    });

    it('should handle double slashes', () => {
      const slugConfig = {
        encoding: 'unicode',
        clean_accents: false,
        sanitize_replacement: '-',
      };

      const entry = {
        path: 'content/en/hosting-and-deployment/deployment-with-nanobox.md',
        data: { title: 'Deployment With NanoBox', category: 'Hosting And Deployment' },
      };

      const field = {
        name: 'title',
        widget: 'string',
        public_folder: '/{{public_folder}}/{{category}}/{{slug}}',
      };
      const collection = {
        name: 'posts',
        folder: 'content',
        fields: [field],
      };

      expect(
        selectMediaFilePublicPath(
          { public_folder: 'static/media/', slug: slugConfig },
          collection,
          'image.png',
          entry,
          field,
        ),
      ).toEqual('/static/media/hosting-and-deployment/deployment-with-nanobox/image.png');
    });

    it('should handle file public_folder', () => {
      const entry = {
        path: 'src/posts/index.md',
        slug: 'index',
      };

      const collection = {
        name: 'posts',
        files: [
          {
            name: 'index',
            public_folder: '/images',
            fields: [{ name: 'title', widget: 'string' }],
          },
        ],
      };

      expect(
        selectMediaFilePublicPath(
          { public_folder: 'static/media/' },
          collection,
          'image.png',
          entry,
          undefined,
        ),
      ).toBe('/images/image.png');
    });
  });

  describe('selectEntries', () => {
    it('should return all entries', () => {
      const state = {
        entities: {
          'posts.1': { slug: '1' },
          'posts.2': { slug: '2' },
          'posts.3': { slug: '3' },
          'posts.4': { slug: '4' },
        },
        pages: { posts: { ids: ['1', '2', '3', '4'] } },
      };
      const collection = {
        name: 'posts',
      };

      expect(selectEntries(state, collection)).toEqual([
        { slug: '1' },
        { slug: '2' },
        { slug: '3' },
        { slug: '4' },
      ]);
    });
  });

  it('should return sorted entries entries by field', () => {
    const state = {
      entities: {
        'posts.1': { slug: '1', data: { title: '1' } },
        'posts.2': { slug: '2', data: { title: '2' } },
        'posts.3': { slug: '3', data: { title: '3' } },
        'posts.4': { slug: '4', data: { title: '4' } },
      },
      pages: { posts: { ids: ['1', '2', '3', '4'] } },
      sort: { posts: { title: { key: 'title', direction: 'Descending' } } },
    };
    const collection = {
      name: 'posts',
    };

    expect(selectEntries(state, collection)).toEqual([
      { slug: '4', data: { title: '4' } },
      { slug: '3', data: { title: '3' } },
      { slug: '2', data: { title: '2' } },
      { slug: '1', data: { title: '1' } },
    ]);
  });

  it('should return sorted entries entries by nested field', () => {
    const state = {
      entities: {
        'posts.1': { slug: '1', data: { title: '1', nested: { date: 4 } } },
        'posts.2': { slug: '2', data: { title: '2', nested: { date: 3 } } },
        'posts.3': { slug: '3', data: { title: '3', nested: { date: 2 } } },
        'posts.4': { slug: '4', data: { title: '4', nested: { date: 1 } } },
      },
      pages: { posts: { ids: ['1', '2', '3', '4'] } },
      sort: { posts: { title: { key: 'nested.date', direction: 'Ascending' } } },
    };
    const collection = {
      name: 'posts',
    };

    expect(selectEntries(state, collection)).toEqual([
      { slug: '4', data: { title: '4', nested: { date: 1 } } },
      { slug: '3', data: { title: '3', nested: { date: 2 } } },
      { slug: '2', data: { title: '2', nested: { date: 3 } } },
      { slug: '1', data: { title: '1', nested: { date: 4 } } },
    ]);
  });

  it('should return filtered entries entries by field', () => {
    const state = {
      entities: {
        'posts.1': { slug: '1', data: { title: '1' } },
        'posts.2': { slug: '2', data: { title: '2' } },
        'posts.3': { slug: '3', data: { title: '3' } },
        'posts.4': { slug: '4', data: { title: '4' } },
      },
      pages: { posts: { ids: ['1', '2', '3', '4'] } },
      filter: { posts: { title__1: { field: 'title', pattern: '4', active: true } } },
    };
    const collection = {
      name: 'posts',
    };

    expect(selectEntries(state, collection)).toEqual([{ slug: '4', data: { title: '4' } }]);
  });

  it('should return filtered entries entries by nested field', () => {
    const state = {
      entities: {
        'posts.1': { slug: '1', data: { title: '1', nested: { draft: true } } },
        'posts.2': { slug: '2', data: { title: '2', nested: { draft: true } } },
        'posts.3': { slug: '3', data: { title: '3', nested: { draft: false } } },
        'posts.4': { slug: '4', data: { title: '4', nested: { draft: false } } },
      },
      pages: { posts: { ids: ['1', '2', '3', '4'] } },
      filter: {
        posts: { 'nested.draft__false': { field: 'nested.draft', pattern: false, active: true } },
      },
    };
    const collection = {
      name: 'posts',
    };

    expect(selectEntries(state, collection)).toEqual([
      { slug: '3', data: { title: '3', nested: { draft: false } } },
      { slug: '4', data: { title: '4', nested: { draft: false } } },
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import { configLoaded } from '@/core/actions/config';
import { FILES, FOLDER } from '@/core/constants/collectionTypes';
import { COMMIT_AUTHOR, COMMIT_DATE } from '@/core/constants/commitProps';
import { registerEntryCodec } from '@/core/lib/registry';
import collections, {
  getFieldsNames,
  selectAllowDeletion,
  selectDefaultSortableFields,
  selectDefaultSortField,
  selectEntryCollectionTitle,
  selectEntryPath,
  selectEntrySlug,
  selectField,
  selectFieldsComments,
  selectFieldsWithMediaFolders,
  selectHasMetaPath,
  selectInferredField,
  selectMediaFolders,
  traverseFields,
  updateFieldByKey,
} from '@/core/reducers/collections';
import { jsonEntryCodec, jsonFrontmatterCodec } from '@/entry-codecs/json/index';
import { createMarkdownEntryCodec } from '@/entry-codecs/markdown/index';
import { tomlEntryCodec, tomlFrontmatterCodec } from '@/entry-codecs/toml/index';
import { yamlEntryCodec, yamlFrontmatterCodec } from '@/entry-codecs/yaml/index';

import type { Backend } from '@/core/backend';

// Path/slug selectors resolve entry extensions through the (real) registry;
// register the built-in entry codecs the fat entries would provide at runtime.
registerEntryCodec(yamlEntryCodec);
registerEntryCodec(tomlEntryCodec);
registerEntryCodec(jsonEntryCodec);
registerEntryCodec(
  createMarkdownEntryCodec({
    frontmatter: [yamlFrontmatterCodec, tomlFrontmatterCodec, jsonFrontmatterCodec],
  }),
);

describe('collections', () => {
  it('should handle an empty state', () => {
    expect(collections(undefined, {})).toEqual({});
  });

  it('should load the collections from the config', () => {
    expect(
      collections(
        undefined,
        configLoaded({
          collections: [
            {
              name: 'posts',
              folder: '_posts',
              fields: [{ name: 'title', widget: 'string' }],
            },
          ],
        }),
      ),
    ).toEqual({
      posts: {
        name: 'posts',
        folder: '_posts',
        fields: [{ name: 'title', widget: 'string' }],
      },
    });
  });

  it('should maintain config collections order', () => {
    const collectionsData = new Array(1000).fill(0).map((_, index) => ({
      name: `collection_${index}`,
      folder: `collection_${index}`,
      fields: [{ name: 'title', widget: 'string' }],
    }));

    const newState = collections(
      undefined,
      configLoaded({
        collections: collectionsData,
      }),
    );
    const keyArray = Object.keys(newState);
    expect(keyArray).toEqual(collectionsData.map(({ name }) => name));
  });

  describe('selectAllowDeletions', () => {
    it('should not allow deletions for file collections', () => {
      expect(
        selectAllowDeletion({
          name: 'pages',
          type: FILES,
        }),
      ).toBe(false);
    });
  });

  describe('selectEntryPath', () => {
    it('should return path', () => {
      expect(
        selectEntryPath(
          {
            type: FOLDER,
            folder: 'posts',
          },
          'dir1/dir2/slug',
        ),
      ).toBe('posts/dir1/dir2/slug.md');
    });
  });

  describe('selectEntrySlug', () => {
    it('should return slug', () => {
      expect(
        selectEntrySlug(
          {
            type: FOLDER,
            folder: 'posts',
          },
          'posts/dir1/dir2/slug.md',
        ),
      ).toBe('dir1/dir2/slug');
    });
  });

  describe('selectFieldsMediaFolders', () => {
    it('should return empty array for invalid collection', () => {
      expect(selectFieldsWithMediaFolders({})).toEqual([]);
    });

    it('should return configs for folder collection', () => {
      expect(
        selectFieldsWithMediaFolders({
          folder: 'posts',
          fields: [
            {
              name: 'image',
              media_folder: 'image_media_folder',
            },
            {
              name: 'body',
              media_folder: 'body_media_folder',
            },
            {
              name: 'list_1',
              field: {
                name: 'list_1_item',
                media_folder: 'list_1_item_media_folder',
              },
            },
            {
              name: 'list_2',
              fields: [
                {
                  name: 'list_2_item',
                  media_folder: 'list_2_item_media_folder',
                },
              ],
            },
            {
              name: 'list_3',
              types: [
                {
                  name: 'list_3_type',
                  media_folder: 'list_3_type_media_folder',
                },
              ],
            },
          ],
        }),
      ).toEqual([
        {
          name: 'image',
          media_folder: 'image_media_folder',
        },
        { name: 'body', media_folder: 'body_media_folder' },
        { name: 'list_1_item', media_folder: 'list_1_item_media_folder' },
        {
          name: 'list_2_item',
          media_folder: 'list_2_item_media_folder',
        },
        {
          name: 'list_3_type',
          media_folder: 'list_3_type_media_folder',
        },
      ]);
    });

    it('should return configs for files collection', () => {
      expect(
        selectFieldsWithMediaFolders(
          {
            files: [
              {
                name: 'file1',
                fields: [
                  {
                    name: 'image',
                    media_folder: 'image_media_folder',
                  },
                ],
              },
              {
                name: 'file2',
                fields: [
                  {
                    name: 'body',
                    media_folder: 'body_media_folder',
                  },
                ],
              },
              {
                name: 'file3',
                fields: [
                  {
                    name: 'list_1',
                    field: {
                      name: 'list_1_item',
                      media_folder: 'list_1_item_media_folder',
                    },
                  },
                ],
              },
              {
                name: 'file4',
                fields: [
                  {
                    name: 'list_2',
                    fields: [
                      {
                        name: 'list_2_item',
                        media_folder: 'list_2_item_media_folder',
                      },
                      {
                        name: 'list_3',
                        types: [
                          {
                            name: 'list_3_type',
                            media_folder: 'list_3_type_media_folder',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          'file4',
        ),
      ).toEqual([
        {
          name: 'list_2_item',
          media_folder: 'list_2_item_media_folder',
        },
        {
          name: 'list_3_type',
          media_folder: 'list_3_type_media_folder',
        },
      ]);
    });
  });

  describe('selectMediaFolders', () => {
    const slug = {
      encoding: 'unicode',
      clean_accents: false,
      sanitize_replacement: '-',
    };

    const config = { slug, media_folder: '/static/img' };
    it('should return fields and collection folders', () => {
      expect(
        selectMediaFolders(
          config,
          {
            folder: 'posts',
            media_folder: '{{media_folder}}/general/',
            fields: [
              {
                name: 'image',
                media_folder: '{{media_folder}}/customers/',
              },
              {
                name: 'list',
                types: [{ name: 'widget', media_folder: '{{media_folder}}/widgets' }],
              },
            ],
          },
          { slug: 'name', path: 'src/post/post1.md', data: {} },
        ),
      ).toEqual([
        'static/img/general',
        'static/img/general/customers',
        'static/img/general/widgets',
      ]);
    });

    it('should return fields, file and collection folders', () => {
      expect(
        selectMediaFolders(
          config,
          {
            media_folder: '{{media_folder}}/general/',
            files: [
              {
                name: 'name',
                file: 'src/post/post1.md',
                media_folder: '{{media_folder}}/customers/',
                fields: [
                  {
                    name: 'image',
                    media_folder: '{{media_folder}}/logos/',
                  },
                  {
                    name: 'list',
                    types: [{ name: 'widget', media_folder: '{{media_folder}}/widgets' }],
                  },
                ],
              },
            ],
          },
          { slug: 'name', path: 'src/post/post1.md', data: {} },
        ),
      ).toEqual([
        'static/img/general',
        'static/img/general/customers',
        'static/img/general/customers/logos',
        'static/img/general/customers/widgets',
      ]);
    });
  });

  describe('getFieldsNames', () => {
    it('should get flat fields names', () => {
      const collection = {
        fields: [{ name: 'en' }, { name: 'es' }],
      };
      expect(getFieldsNames(collection.fields)).toEqual(['en', 'es']);
    });

    it('should get nested fields names', () => {
      const collection = {
        fields: [
          { name: 'en', fields: [{ name: 'title' }, { name: 'body' }] },
          { name: 'es', fields: [{ name: 'title' }, { name: 'body' }] },
          { name: 'it', field: { name: 'title', fields: [{ name: 'subTitle' }] } },
          {
            name: 'fr',
            fields: [{ name: 'title', widget: 'list', types: [{ name: 'variableType' }] }],
          },
        ],
      };
      expect(getFieldsNames(collection.fields)).toEqual([
        'en',
        'es',
        'it',
        'fr',
        'en.title',
        'en.body',
        'es.title',
        'es.body',
        'it.title',
        'it.title.subTitle',
        'fr.title',
        'fr.title.variableType',
      ]);
    });
  });

  describe('selectField', () => {
    it('should return top field by key', () => {
      const collection = {
        fields: [{ name: 'en' }, { name: 'es' }],
      };
      expect(selectField(collection, 'en')).toBe(collection.fields[0]);
    });

    it('should return nested field by key', () => {
      const collection = {
        fields: [
          { name: 'en', fields: [{ name: 'title' }, { name: 'body' }] },
          { name: 'es', fields: [{ name: 'title' }, { name: 'body' }] },
          { name: 'it', field: { name: 'title', fields: [{ name: 'subTitle' }] } },
          {
            name: 'fr',
            fields: [{ name: 'title', widget: 'list', types: [{ name: 'variableType' }] }],
          },
        ],
      };

      expect(selectField(collection, 'en.title')).toBe(collection.fields[0].fields[0]);

      expect(selectField(collection, 'it.title.subTitle')).toBe(
        collection.fields[2].field.fields[0],
      );

      expect(selectField(collection, 'fr.title.variableType')).toBe(
        collection.fields[3].fields[0].types[0],
      );
    });
  });

  describe('selectEntryCollectionTitle', () => {
    const entry = {
      data: { title: 'entry title', otherField: 'other field', emptyLinkTitle: '' },
    };

    it('should return the entry title if set', () => {
      const collection = {
        fields: [{ name: 'title' }, { name: 'otherField' }],
      };

      expect(selectEntryCollectionTitle(collection, entry)).toEqual('entry title');
    });

    it('should return some other inferreable title if set', () => {
      const headlineEntry = {
        data: { headline: 'entry headline', otherField: 'other field' },
      };
      const collection = {
        fields: [{ name: 'headline' }, { name: 'otherField' }],
      };

      expect(selectEntryCollectionTitle(collection, headlineEntry)).toEqual('entry headline');
    });

    it('should return the identifier_field content if defined in collection', () => {
      const collection = {
        identifier_field: 'otherField',
        fields: [{ name: 'title' }, { name: 'otherField' }],
      };

      expect(selectEntryCollectionTitle(collection, entry)).toEqual('other field');
    });

    it('should return the entry title if identifier_field content is not defined in collection', () => {
      const collection = {
        identifier_field: 'missingLinkTitle',
        fields: [{ name: 'title' }, { name: 'otherField' }],
      };

      expect(selectEntryCollectionTitle(collection, entry)).toEqual('entry title');
    });

    it('should return the entry title if identifier_field content is empty', () => {
      const collection = {
        identifier_field: 'emptyLinkTitle',
        fields: [{ name: 'title' }, { name: 'otherField' }, { name: 'emptyLinkTitle' }],
      };

      expect(selectEntryCollectionTitle(collection, entry)).toEqual('entry title');
    });

    it('should return the entry label of a file collection', () => {
      const labelEntry = {
        slug: 'entry-name',
        data: { title: 'entry title', otherField: 'other field' },
      };
      const collection = {
        type: FILES,
        files: [
          {
            name: 'entry-name',
            label: 'entry label',
          },
        ],
      };

      expect(selectEntryCollectionTitle(collection, labelEntry)).toEqual('entry label');
    });

    it('should return a formatted summary before everything else', () => {
      const collection = {
        summary: '{{title}} -- {{otherField}}',
        identifier_field: 'otherField',
        fields: [{ name: 'title' }, { name: 'otherField' }],
      };

      expect(selectEntryCollectionTitle(collection, entry)).toEqual('entry title -- other field');
    });
  });

  describe('updateFieldByKey', () => {
    it('should update field by key', () => {
      const collection = {
        fields: [
          { name: 'title' },
          { name: 'image' },
          {
            name: 'object',
            fields: [{ name: 'title' }, { name: 'gallery', fields: [{ name: 'image' }] }],
          },
          { name: 'list', field: { name: 'image' } },
          { name: 'body' },
          { name: 'widgetList', types: [{ name: 'widget' }] },
        ],
      };

      function updater(field) {
        return { ...field, default: 'default' };
      }

      expect(updateFieldByKey(collection, 'non-existent', updater)).toBe(collection);
      expect(updateFieldByKey(collection, 'title', updater)).toEqual({
        fields: [
          { name: 'title', default: 'default' },
          { name: 'image' },
          {
            name: 'object',
            fields: [{ name: 'title' }, { name: 'gallery', fields: [{ name: 'image' }] }],
          },
          { name: 'list', field: { name: 'image' } },
          { name: 'body' },
          { name: 'widgetList', types: [{ name: 'widget' }] },
        ],
      });
      expect(updateFieldByKey(collection, 'object.title', updater)).toEqual({
        fields: [
          { name: 'title' },
          { name: 'image' },
          {
            name: 'object',
            fields: [
              { name: 'title', default: 'default' },
              { name: 'gallery', fields: [{ name: 'image' }] },
            ],
          },
          { name: 'list', field: { name: 'image' } },
          { name: 'body' },
          { name: 'widgetList', types: [{ name: 'widget' }] },
        ],
      });

      expect(updateFieldByKey(collection, 'object.gallery.image', updater)).toEqual({
        fields: [
          { name: 'title' },
          { name: 'image' },
          {
            name: 'object',
            fields: [
              { name: 'title' },
              { name: 'gallery', fields: [{ name: 'image', default: 'default' }] },
            ],
          },
          { name: 'list', field: { name: 'image' } },
          { name: 'body' },
          { name: 'widgetList', types: [{ name: 'widget' }] },
        ],
      });
      expect(updateFieldByKey(collection, 'list.image', updater)).toEqual({
        fields: [
          { name: 'title' },
          { name: 'image' },
          {
            name: 'object',
            fields: [{ name: 'title' }, { name: 'gallery', fields: [{ name: 'image' }] }],
          },
          { name: 'list', field: { name: 'image', default: 'default' } },
          { name: 'body' },
          { name: 'widgetList', types: [{ name: 'widget' }] },
        ],
      });

      expect(updateFieldByKey(collection, 'widgetList.widget', updater)).toEqual({
        fields: [
          { name: 'title' },
          { name: 'image' },
          {
            name: 'object',
            fields: [{ name: 'title' }, { name: 'gallery', fields: [{ name: 'image' }] }],
          },
          { name: 'list', field: { name: 'image' } },
          { name: 'body' },
          { name: 'widgetList', types: [{ name: 'widget', default: 'default' }] },
        ],
      });
    });
  });

  describe("selectInferredField(collection, 'date')", () => {
    it('should return publishDate if set', () => {
      const collection = {
        fields: [{ name: 'title' }, { name: 'publishDate', widget: 'datetime' }],
      };

      expect(selectInferredField(collection, 'date')).toEqual('publishDate');
    });

    it('should return publish_date if set', () => {
      const collection = {
        fields: [{ name: 'title' }, { name: 'publish_date', widget: 'datetime' }],
      };

      expect(selectInferredField(collection, 'date')).toEqual('publish_date');
    });

    it('should return date if set', () => {
      const collection = {
        fields: [{ name: 'title' }, { name: 'date', widget: 'datetime' }],
      };

      expect(selectInferredField(collection, 'date')).toEqual('date');
    });

    it('should return first date field if multiple synonyms are present', () => {
      const collection = {
        fields: [
          { name: 'title' },
          { name: 'publishDate', widget: 'datetime' },
          { name: 'date', widget: 'datetime' },
        ],
      };

      expect(selectInferredField(collection, 'date')).toEqual('publishDate');
    });
  });

  describe('selectDefaultSortableFields', () => {
    const gitBackend = { isGitBackend: () => true } as unknown as Backend;
    const nonGitBackend = { isGitBackend: () => false } as unknown as Backend;
    const backendWithoutProbe = {} as unknown as Backend;

    const collectionWithAuthor = { fields: [{ name: 'title' }, { name: 'author' }] };
    const collectionWithoutAuthor = { fields: [{ name: 'title' }] };

    const fieldNames = (
      collection: object,
      backend: Backend,
      hasIntegration: boolean,
    ) => selectDefaultSortableFields(collection as never, backend, hasIntegration).map(f => f.field);

    it('prepends COMMIT_DATE for a git backend without integration', () => {
      expect(fieldNames(collectionWithAuthor, gitBackend, false)).toEqual([
        COMMIT_DATE,
        'title',
        'author',
      ]);
    });

    it('does not prepend COMMIT_DATE for a non-git backend', () => {
      expect(fieldNames(collectionWithAuthor, nonGitBackend, false)).toEqual(['title', 'author']);
    });

    it('does not prepend COMMIT_DATE when the backend has no isGitBackend', () => {
      expect(fieldNames(collectionWithAuthor, backendWithoutProbe, false)).toEqual([
        'title',
        'author',
      ]);
    });

    it('does not prepend COMMIT_DATE when an integration is present', () => {
      expect(fieldNames(collectionWithAuthor, gitBackend, true)).toEqual(['title', 'author']);
    });

    it('falls back to COMMIT_AUTHOR when there is no author field on a git backend without integration', () => {
      expect(fieldNames(collectionWithoutAuthor, gitBackend, false)).toEqual([
        COMMIT_DATE,
        'title',
        COMMIT_AUTHOR,
      ]);
    });

    it('does not fall back to COMMIT_AUTHOR for non-git backends or with integration', () => {
      expect(fieldNames(collectionWithoutAuthor, nonGitBackend, false)).toEqual(['title']);
      expect(fieldNames(collectionWithoutAuthor, gitBackend, true)).toEqual(['title']);
    });

    it('wraps each field name in an object', () => {
      expect(
        selectDefaultSortableFields(collectionWithoutAuthor as never, nonGitBackend, false),
      ).toEqual([{ field: 'title' }]);
    });
  });

  describe('selectDefaultSortField', () => {
    const withSortable = (sortable_fields?: object[]) => ({ sortable_fields }) as never;

    it('returns null when no sortable field has default_sort', () => {
      expect(selectDefaultSortField(withSortable([{ field: 'title' }]))).toBeNull();
    });

    it('returns null when sortable_fields is missing', () => {
      expect(selectDefaultSortField(withSortable(undefined))).toBeNull();
    });

    it('maps default_sort true to asc', () => {
      expect(selectDefaultSortField(withSortable([{ field: 'title', default_sort: true }]))).toEqual({
        field: 'title',
        direction: 'asc',
      });
    });

    it('maps default_sort asc to asc', () => {
      expect(selectDefaultSortField(withSortable([{ field: 'title', default_sort: 'asc' }]))).toEqual({
        field: 'title',
        direction: 'asc',
      });
    });

    it('maps default_sort desc to desc', () => {
      expect(selectDefaultSortField(withSortable([{ field: 'date', default_sort: 'desc' }]))).toEqual({
        field: 'date',
        direction: 'desc',
      });
    });

    it('picks the first field that declares default_sort', () => {
      expect(
        selectDefaultSortField(
          withSortable([{ field: 'title' }, { field: 'date', default_sort: 'desc' }, { field: 'x', default_sort: true }]),
        ),
      ).toEqual({ field: 'date', direction: 'desc' });
    });

    it('treats default_sort: false as declared and falls back to asc', () => {
      expect(selectDefaultSortField(withSortable([{ field: 'title', default_sort: false }]))).toEqual({
        field: 'title',
        direction: 'asc',
      });
    });
  });

  describe('selectFieldsComments', () => {
    const entry = (slug: string) => ({ slug }) as never;

    it('returns comments for top-level and nested fields of a folder collection, omitting uncommented ones', () => {
      const collection = {
        folder: 'posts',
        fields: [
          { name: 'title', comment: 'The title' },
          { name: 'plain' },
          { name: 'meta', fields: [{ name: 'author', comment: 'Author name' }, { name: 'skip' }] },
          { name: 'single', field: { name: 'inner', comment: 'Inner comment' } },
          { name: 'blocks', types: [{ name: 'hero', comment: 'Hero block' }] },
        ],
      };
      expect(selectFieldsComments(collection as never, entry('any'))).toEqual({
        title: 'The title',
        'meta.author': 'Author name',
        'single.inner': 'Inner comment',
        'blocks.hero': 'Hero block',
      });
    });

    it('returns an empty object for a folder collection without commented fields', () => {
      const collection = { folder: 'posts', fields: [{ name: 'title' }] };
      expect(selectFieldsComments(collection as never, entry('x'))).toEqual({});
    });

    it('returns an empty object for a files collection when the slug matches no file', () => {
      const collection = {
        files: [{ name: 'about', fields: [{ name: 'title', comment: 'c' }] }],
        fields: [{ name: 'title', comment: 'c' }],
      };
      expect(selectFieldsComments(collection as never, entry('unknown'))).toEqual({});
    });

    it('resolves comments through the file matching entry.slug for a files collection', () => {
      // Field names come from the matched file, but comments are looked up via
      // selectField on collection.fields, so the collection must expose them too.
      const collection = {
        files: [
          { name: 'about', fields: [{ name: 'title' }] },
          { name: 'contact', fields: [{ name: 'email' }] },
        ],
        fields: [{ name: 'title', comment: 'About title' }, { name: 'email', comment: 'Mail' }],
      };
      expect(selectFieldsComments(collection as never, entry('about'))).toEqual({ title: 'About title' });
      expect(selectFieldsComments(collection as never, entry('contact'))).toEqual({ email: 'Mail' });
    });
  });

  describe('selectHasMetaPath', () => {
    it('is truthy for a folder collection with meta.path', () => {
      const collection = { folder: 'posts', type: FOLDER, meta: { path: { label: 'Path', widget: 'string', index_file: 'index' } } };
      expect(selectHasMetaPath(collection as never)).toBeTruthy();
    });

    it('is falsy for a files collection', () => {
      const collection = { files: [], type: FILES, meta: { path: {} } };
      expect(selectHasMetaPath(collection as never)).toBeFalsy();
    });

    it('is falsy when meta is missing', () => {
      expect(selectHasMetaPath({ folder: 'posts', type: FOLDER } as never)).toBeFalsy();
    });

    it('is falsy when meta has no path', () => {
      expect(selectHasMetaPath({ folder: 'posts', type: FOLDER, meta: {} } as never)).toBeFalsy();
    });
  });

  describe('traverseFields', () => {
    const tree = () => [
      { name: 'a', fields: [{ name: 'a1' }, { name: 'a2' }] },
      { name: 'b', field: { name: 'b1', fields: [{ name: 'b2' }] } },
      { name: 'c', types: [{ name: 'c1' }] },
    ];
    const tag = (f: { name: string }) => ({ ...f, tagged: true });

    it('applies the updater to nested fields, field and types', () => {
      const result = traverseFields(tree() as never, tag as never) as never as Array<Record<string, any>>;
      expect(result.map(f => f.tagged)).toEqual([true, true, true]);
      expect(result[0].fields.map((f: any) => f.tagged)).toEqual([true, true]);
      expect(result[1].field.tagged).toBe(true);
      expect(result[1].field.fields[0].tagged).toBe(true);
      expect(result[2].types[0].tagged).toBe(true);
    });

    it('stops descending once done() returns true', () => {
      const visited: string[] = [];
      const updater = (f: { name: string }) => {
        visited.push(f.name);
        return f;
      };
      traverseFields(tree() as never, updater as never, () => visited.includes('a'));
      // siblings still get the updater (map continues) but no nested field is descended into
      expect(visited).toEqual(['a', 'b', 'c']);
    });

    it('returns the input untouched when done() is initially true', () => {
      const input = tree();
      let called = false;
      const result = traverseFields(input as never, ((f: unknown) => {
        called = true;
        return f;
      }) as never, () => true);
      expect(result).toBe(input);
      expect(called).toBe(false);
    });
  });
});

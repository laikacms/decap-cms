import { fromJS, Map } from 'immutable';

import { configLoaded } from '../../actions/config';
import collections, {
  selectAllowDeletion,
  selectEntryPath,
  selectEntrySlug,
  selectFieldsWithMediaFolders,
  selectMediaFolders,
  selectEntryCollectionTitle,
  getFieldsNames,
  selectField,
  updateFieldByKey,
  selectIdentifier,
  selectInferredField,
  selectSortableFields,
  selectDefaultSortField,
  selectSortDataPath,
  selectViewFilters,
  selectViewGroups,
  selectHasMetaPath,
} from '../collections';
import { FILES, FOLDER } from '../../constants/collectionTypes';
import { COMMIT_DATE, COMMIT_AUTHOR } from '../../constants/commitProps';

describe('collections', () => {
  it('should handle an empty state', () => {
    expect(collections(undefined, {})).toEqual(Map());
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
      ).toJS(),
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
    const keyArray = newState.keySeq().toArray();
    expect(keyArray).toEqual(collectionsData.map(({ name }) => name));
  });

  describe('selectAllowDeletions', () => {
    it('should not allow deletions for file collections', () => {
      expect(
        selectAllowDeletion(
          fromJS({
            name: 'pages',
            type: FILES,
          }),
        ),
      ).toBe(false);
    });
  });

  describe('selectEntryPath', () => {
    it('should return path', () => {
      expect(
        selectEntryPath(
          fromJS({
            type: FOLDER,
            folder: 'posts',
          }),
          'dir1/dir2/slug',
        ),
      ).toBe('posts/dir1/dir2/slug.md');
    });
  });

  describe('selectEntrySlug', () => {
    it('should return slug', () => {
      expect(
        selectEntrySlug(
          fromJS({
            type: FOLDER,
            folder: 'posts',
          }),
          'posts/dir1/dir2/slug.md',
        ),
      ).toBe('dir1/dir2/slug');
    });
  });

  describe('selectFieldsMediaFolders', () => {
    it('should return empty array for invalid collection', () => {
      expect(selectFieldsWithMediaFolders(fromJS({}))).toEqual([]);
    });

    it('should return configs for folder collection', () => {
      expect(
        selectFieldsWithMediaFolders(
          fromJS({
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
        ),
      ).toEqual([
        fromJS({
          name: 'image',
          media_folder: 'image_media_folder',
        }),
        fromJS({ name: 'body', media_folder: 'body_media_folder' }),
        fromJS({ name: 'list_1_item', media_folder: 'list_1_item_media_folder' }),
        fromJS({
          name: 'list_2_item',
          media_folder: 'list_2_item_media_folder',
        }),
        fromJS({
          name: 'list_3_type',
          media_folder: 'list_3_type_media_folder',
        }),
      ]);
    });

    it('should return configs for files collection', () => {
      expect(
        selectFieldsWithMediaFolders(
          fromJS({
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
          }),
          'file4',
        ),
      ).toEqual([
        fromJS({
          name: 'list_2_item',
          media_folder: 'list_2_item_media_folder',
        }),
        fromJS({
          name: 'list_3_type',
          media_folder: 'list_3_type_media_folder',
        }),
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
          fromJS({
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
          }),
          fromJS({ slug: 'name', path: 'src/post/post1.md', data: {} }),
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
          fromJS({
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
          }),
          fromJS({ slug: 'name', path: 'src/post/post1.md', data: {} }),
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
      const collection = fromJS({
        fields: [{ name: 'en' }, { name: 'es' }],
      });
      expect(getFieldsNames(collection.get('fields').toArray())).toEqual(['en', 'es']);
    });

    it('should get nested fields names', () => {
      const collection = fromJS({
        fields: [
          { name: 'en', fields: [{ name: 'title' }, { name: 'body' }] },
          { name: 'es', fields: [{ name: 'title' }, { name: 'body' }] },
          { name: 'it', field: { name: 'title', fields: [{ name: 'subTitle' }] } },
          {
            name: 'fr',
            fields: [{ name: 'title', widget: 'list', types: [{ name: 'variableType' }] }],
          },
        ],
      });
      expect(getFieldsNames(collection.get('fields').toArray())).toEqual([
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
      const collection = fromJS({
        fields: [{ name: 'en' }, { name: 'es' }],
      });
      expect(selectField(collection, 'en')).toBe(collection.get('fields').get(0));
    });

    it('should return nested field by key', () => {
      const collection = fromJS({
        fields: [
          { name: 'en', fields: [{ name: 'title' }, { name: 'body' }] },
          { name: 'es', fields: [{ name: 'title' }, { name: 'body' }] },
          { name: 'it', field: { name: 'title', fields: [{ name: 'subTitle' }] } },
          {
            name: 'fr',
            fields: [{ name: 'title', widget: 'list', types: [{ name: 'variableType' }] }],
          },
        ],
      });

      expect(selectField(collection, 'en.title')).toBe(
        collection.get('fields').get(0).get('fields').get(0),
      );

      expect(selectField(collection, 'it.title.subTitle')).toBe(
        collection.get('fields').get(2).get('field').get('fields').get(0),
      );

      expect(selectField(collection, 'fr.title.variableType')).toBe(
        collection.get('fields').get(3).get('fields').get(0).get('types').get(0),
      );
    });
  });

  describe('selectEntryCollectionTitle', () => {
    const entry = fromJS({
      data: { title: 'entry title', otherField: 'other field', emptyLinkTitle: '' },
    });

    it('should return the entry title if set', () => {
      const collection = fromJS({
        fields: [{ name: 'title' }, { name: 'otherField' }],
      });

      expect(selectEntryCollectionTitle(collection, entry)).toEqual('entry title');
    });

    it('should return some other inferreable title if set', () => {
      const headlineEntry = fromJS({
        data: { headline: 'entry headline', otherField: 'other field' },
      });
      const collection = fromJS({
        fields: [{ name: 'headline' }, { name: 'otherField' }],
      });

      expect(selectEntryCollectionTitle(collection, headlineEntry)).toEqual('entry headline');
    });

    it('should return the identifier_field content if defined in collection', () => {
      const collection = fromJS({
        identifier_field: 'otherField',
        fields: [{ name: 'title' }, { name: 'otherField' }],
      });

      expect(selectEntryCollectionTitle(collection, entry)).toEqual('other field');
    });

    it('should return the entry title if identifier_field content is not defined in collection', () => {
      const collection = fromJS({
        identifier_field: 'missingLinkTitle',
        fields: [{ name: 'title' }, { name: 'otherField' }],
      });

      expect(selectEntryCollectionTitle(collection, entry)).toEqual('entry title');
    });

    it('should return the entry title if identifier_field content is empty', () => {
      const collection = fromJS({
        identifier_field: 'emptyLinkTitle',
        fields: [{ name: 'title' }, { name: 'otherField' }, { name: 'emptyLinkTitle' }],
      });

      expect(selectEntryCollectionTitle(collection, entry)).toEqual('entry title');
    });

    it('should return the entry label of a file collection', () => {
      const labelEntry = fromJS({
        slug: 'entry-name',
        data: { title: 'entry title', otherField: 'other field' },
      });
      const collection = fromJS({
        type: FILES,
        files: [
          {
            name: 'entry-name',
            label: 'entry label',
          },
        ],
      });

      expect(selectEntryCollectionTitle(collection, labelEntry)).toEqual('entry label');
    });

    it('should return a formatted summary before everything else', () => {
      const collection = fromJS({
        summary: '{{title}} -- {{otherField}}',
        identifier_field: 'otherField',
        fields: [{ name: 'title' }, { name: 'otherField' }],
      });

      expect(selectEntryCollectionTitle(collection, entry)).toEqual('entry title -- other field');
    });
  });

  describe('updateFieldByKey', () => {
    it('should update field by key', () => {
      const collection = fromJS({
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
      });

      function updater(field) {
        return field.set('default', 'default');
      }

      expect(updateFieldByKey(collection, 'non-existent', updater)).toBe(collection);
      expect(updateFieldByKey(collection, 'title', updater)).toEqual(
        fromJS({
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
        }),
      );
      expect(updateFieldByKey(collection, 'object.title', updater)).toEqual(
        fromJS({
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
        }),
      );

      expect(updateFieldByKey(collection, 'object.gallery.image', updater)).toEqual(
        fromJS({
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
        }),
      );
      expect(updateFieldByKey(collection, 'list.image', updater)).toEqual(
        fromJS({
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
        }),
      );

      expect(updateFieldByKey(collection, 'widgetList.widget', updater)).toEqual(
        fromJS({
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
        }),
      );
    });
  });

  describe("selectInferredField(collection, 'date')", () => {
    it('should return publishDate if set', () => {
      const collection = fromJS({
        fields: [{ name: 'title' }, { name: 'publishDate', widget: 'datetime' }],
      });

      expect(selectInferredField(collection, 'date')).toEqual('publishDate');
    });

    it('should return publish_date if set', () => {
      const collection = fromJS({
        fields: [{ name: 'title' }, { name: 'publish_date', widget: 'datetime' }],
      });

      expect(selectInferredField(collection, 'date')).toEqual('publish_date');
    });

    it('should return date if set', () => {
      const collection = fromJS({
        fields: [{ name: 'title' }, { name: 'date', widget: 'datetime' }],
      });

      expect(selectInferredField(collection, 'date')).toEqual('date');
    });

    it('should return first date field if multiple synonyms are present', () => {
      const collection = fromJS({
        fields: [
          { name: 'title' },
          { name: 'publishDate', widget: 'datetime' },
          { name: 'date', widget: 'datetime' },
        ],
      });

      expect(selectInferredField(collection, 'date')).toEqual('publishDate');
    });
  });

  describe('selectIdentifier', () => {
    it('should return the identifier_field if set and present', () => {
      const collection = fromJS({
        identifier_field: 'name',
        fields: [{ name: 'name' }, { name: 'title' }],
      });

      expect(selectIdentifier(collection)).toEqual('name');
    });

    it('should return title if identifier_field is not set', () => {
      const collection = fromJS({
        fields: [{ name: 'title' }, { name: 'path' }],
      });

      expect(selectIdentifier(collection)).toEqual('title');
    });

    it('should fall back to a field named path if there is no title and no identifier_field', () => {
      const collection = fromJS({
        fields: [{ name: 'path' }, { name: 'body' }],
      });

      expect(selectIdentifier(collection)).toEqual('path');
    });

    it('should fall back to path if identifier_field is set but not present', () => {
      const collection = fromJS({
        identifier_field: 'name',
        fields: [{ name: 'path' }, { name: 'body' }],
      });

      expect(selectIdentifier(collection)).toEqual('path');
    });

    it('should return undefined if no title, identifier_field, or path field is present', () => {
      const collection = fromJS({
        fields: [{ name: 'body' }],
      });

      expect(selectIdentifier(collection)).toEqual(undefined);
    });
  });

  describe('selectSortableFields', () => {
    function t(key) {
      return key;
    }

    it('should return COMMIT_DATE entry with default label', () => {
      const collection = fromJS({
        sortable_fields: [{ field: COMMIT_DATE }],
        fields: [],
      });
      const result = selectSortableFields(collection, t);
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe(COMMIT_DATE);
      expect(result[0].name).toBe(COMMIT_DATE);
      expect(result[0].label).toBeTruthy();
    });

    it('should use custom label for COMMIT_DATE when provided', () => {
      const collection = fromJS({
        sortable_fields: [{ field: COMMIT_DATE, label: 'Modified' }],
        fields: [],
      });
      const result = selectSortableFields(collection, t);
      expect(result[0].label).toBe('Modified');
    });

    it('should return COMMIT_AUTHOR entry when no author field exists', () => {
      const collection = fromJS({
        sortable_fields: [{ field: COMMIT_AUTHOR }],
        fields: [],
      });
      const result = selectSortableFields(collection, t);
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe(COMMIT_AUTHOR);
      expect(result[0].name).toBe(COMMIT_AUTHOR);
    });

    it('should use custom label for COMMIT_AUTHOR when provided', () => {
      const collection = fromJS({
        sortable_fields: [{ field: COMMIT_AUTHOR, label: 'Writer' }],
        fields: [],
      });
      const result = selectSortableFields(collection, t);
      expect(result[0].label).toBe('Writer');
    });

    it('should use custom label override for a regular field', () => {
      const collection = fromJS({
        sortable_fields: [{ field: 'title', label: 'Headline' }],
        fields: [{ name: 'title', label: 'Title', widget: 'string' }],
      });
      const result = selectSortableFields(collection, t);
      expect(result[0].label).toBe('Headline');
    });

    it('should filter out sortable fields that do not exist in the collection', () => {
      const collection = fromJS({
        sortable_fields: [{ field: 'nonexistent' }],
        fields: [{ name: 'title', widget: 'string' }],
      });
      const result = selectSortableFields(collection, t);
      expect(result).toHaveLength(0);
    });

    it('should return multiple sortable fields in order', () => {
      const collection = fromJS({
        sortable_fields: [{ field: COMMIT_DATE }, { field: 'title' }],
        fields: [{ name: 'title', label: 'Title', widget: 'string' }],
      });
      const result = selectSortableFields(collection, t);
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe(COMMIT_DATE);
      expect(result[1].key).toBe('title');
    });
  });

  describe('selectDefaultSortField', () => {
    it('should return null when no field has default_sort set', () => {
      const collection = fromJS({
        sortable_fields: [{ field: 'title' }, { field: COMMIT_DATE }],
      });
      expect(selectDefaultSortField(collection)).toBeNull();
    });

    it('should return field and direction "desc" when default_sort is "desc"', () => {
      const collection = fromJS({
        sortable_fields: [{ field: 'title', default_sort: 'desc' }],
      });
      const result = selectDefaultSortField(collection);
      expect(result).toEqual({ field: 'title', direction: 'desc' });
    });

    it('should return direction "asc" when default_sort is "asc"', () => {
      const collection = fromJS({
        sortable_fields: [{ field: 'title', default_sort: 'asc' }],
      });
      const result = selectDefaultSortField(collection);
      expect(result).toEqual({ field: 'title', direction: 'asc' });
    });

    it('should return null when default_sort is true (boolean values do not activate sort)', () => {
      const collection = fromJS({
        sortable_fields: [{ field: 'title', default_sort: true }],
      });
      const result = selectDefaultSortField(collection);
      expect(result).toBeNull();
    });

    it('should return null when default_sort is false (boolean values do not activate sort)', () => {
      const collection = fromJS({
        sortable_fields: [{ field: 'title', default_sort: false }],
      });
      const result = selectDefaultSortField(collection);
      expect(result).toBeNull();
    });

    it('should use the first field with default_sort when multiple are set', () => {
      const collection = fromJS({
        sortable_fields: [
          { field: 'title', default_sort: 'asc' },
          { field: 'date', default_sort: 'desc' },
        ],
      });
      const result = selectDefaultSortField(collection);
      expect(result).toEqual({ field: 'title', direction: 'asc' });
    });
  });

  describe('selectSortDataPath', () => {
    const collection = fromJS({
      fields: [{ name: 'title', widget: 'string' }],
    });

    it('should return "updatedOn" for COMMIT_DATE key', () => {
      expect(selectSortDataPath(collection, COMMIT_DATE)).toBe('updatedOn');
    });

    it('should return "author" for COMMIT_AUTHOR key when no author field exists', () => {
      expect(selectSortDataPath(collection, COMMIT_AUTHOR)).toBe('author');
    });

    it('should return "data.<key>" for a regular field key', () => {
      expect(selectSortDataPath(collection, 'title')).toBe('data.title');
    });

    it('should return "data.<key>" for COMMIT_AUTHOR when an author field exists in the collection', () => {
      const collectionWithAuthor = fromJS({
        fields: [{ name: COMMIT_AUTHOR, widget: 'string' }],
      });
      expect(selectSortDataPath(collectionWithAuthor, COMMIT_AUTHOR)).toBe(`data.${COMMIT_AUTHOR}`);
    });
  });

  describe('selectViewFilters', () => {
    it('should return an empty array when view_filters is empty', () => {
      const collection = fromJS({
        view_filters: [],
      });
      expect(selectViewFilters(collection)).toEqual([]);
    });

    it('should return view_filters as a plain JS array', () => {
      const collection = fromJS({
        view_filters: [
          { label: 'Drafts', field: 'draft', pattern: true },
          { label: 'Published', field: 'draft', pattern: false },
        ],
      });
      const result = selectViewFilters(collection);
      expect(result).toEqual([
        { label: 'Drafts', field: 'draft', pattern: true },
        { label: 'Published', field: 'draft', pattern: false },
      ]);
    });
  });

  describe('selectViewGroups', () => {
    it('should return an empty array when view_groups is empty', () => {
      const collection = fromJS({
        view_groups: [],
      });
      expect(selectViewGroups(collection)).toEqual([]);
    });

    it('should return view_groups as a plain JS array', () => {
      const collection = fromJS({
        view_groups: [
          { label: 'Year', field: 'date', pattern: '\\d{4}' },
          { label: 'Drafts', field: 'draft' },
        ],
      });
      const result = selectViewGroups(collection);
      expect(result).toEqual([
        { label: 'Year', field: 'date', pattern: '\\d{4}' },
        { label: 'Drafts', field: 'draft' },
      ]);
    });
  });

  describe('selectHasMetaPath', () => {
    it('should return true for a folder collection with meta.path defined', () => {
      const collection = fromJS({
        folder: '_posts',
        type: FOLDER,
        meta: { path: { label: 'Path', widget: 'string', index_file: 'index' } },
        fields: [],
      });
      expect(selectHasMetaPath(collection)).toBe(true);
    });

    it('should return false for a folder collection without meta', () => {
      const collection = fromJS({
        folder: '_posts',
        type: FOLDER,
        fields: [],
      });
      expect(selectHasMetaPath(collection)).toBeFalsy();
    });

    it('should return false for a folder collection with meta but no path', () => {
      const collection = fromJS({
        folder: '_posts',
        type: FOLDER,
        meta: { other: 'value' },
        fields: [],
      });
      expect(selectHasMetaPath(collection)).toBeFalsy();
    });

    it('should return false for a files collection even with meta.path defined', () => {
      const collection = fromJS({
        type: FILES,
        files: [],
        meta: { path: { label: 'Path' } },
      });
      expect(selectHasMetaPath(collection)).toBeFalsy();
    });
  });
});

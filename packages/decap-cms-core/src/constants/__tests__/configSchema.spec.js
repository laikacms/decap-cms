import merge from 'lodash/merge';

import { validateConfig } from '../configSchema';

jest.mock('../../lib/registry');

describe('config', () => {
  /**
   * Suppress error logging to reduce noise during testing. Jest will still
   * log test failures and associated errors as expected.
   */
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  const { getWidgets } = require('../../lib/registry');
  getWidgets.mockImplementation(() => [{}]);

  describe('validateConfig', () => {
    const validConfig = {
      foo: 'bar',
      backend: { name: 'bar' },
      media_folder: 'baz',
      collections: [
        {
          name: 'posts',
          label: 'Posts',
          folder: '_posts',
          fields: [{ name: 'title', label: 'title', widget: 'string' }],
        },
      ],
    };

    it('should not throw if no errors', () => {
      expect(() => {
        validateConfig(validConfig);
      }).not.toThrowError();
    });

    it('should not throw when media_folder_relative is set (removed field, silently ignored as extra property)', () => {
      // media_folder_relative was removed in DCMS-080 — it was a no-op since 2019.
      // The top-level schema has no additionalProperties:false so it passes through without error.
      expect(() => {
        validateConfig({ ...validConfig, media_folder_relative: true });
      }).not.toThrowError();
    });

    it('should throw if backend is not defined in config', () => {
      expect(() => {
        validateConfig({ foo: 'bar' });
      }).toThrowError("config must have required property 'backend'");
    });

    it('should throw if backend name is not defined in config', () => {
      expect(() => {
        validateConfig({ foo: 'bar', backend: {} });
      }).toThrowError("'backend' must have required property 'name'");
    });

    it('should throw if backend name is not a string in config', () => {
      expect(() => {
        validateConfig({ foo: 'bar', backend: { name: {} } });
      }).toThrowError("'backend.name' must be string");
    });

    it('should throw if backend.open_authoring is not a boolean in config', () => {
      expect(() => {
        validateConfig(merge(validConfig, { backend: { open_authoring: 'true' } }));
      }).toThrowError("'backend.open_authoring' must be boolean");
    });

    it('should not throw if backend.open_authoring is boolean in config', () => {
      expect(() => {
        validateConfig(merge(validConfig, { backend: { open_authoring: true } }));
      }).not.toThrowError();
    });

    it('should throw if backend.auth_scope is not "repo" or "public_repo" in config', () => {
      expect(() => {
        validateConfig(merge(validConfig, { backend: { auth_scope: 'user' } }));
      }).toThrowError("'backend.auth_scope' must be equal to one of the allowed values");
    });

    it('should not throw if backend.auth_scope is one of "repo" or "public_repo" in config', () => {
      expect(() => {
        validateConfig(merge(validConfig, { backend: { auth_scope: 'repo' } }));
      }).not.toThrowError();
      expect(() => {
        validateConfig(merge(validConfig, { backend: { auth_scope: 'public_repo' } }));
      }).not.toThrowError();
    });

    it('should not throw if backend.commit_messages.create is a string', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, { backend: { commit_messages: { create: 'Created {{slug}}' } } }),
        );
      }).not.toThrowError();
    });

    it('should throw if backend.commit_messages.create is not a string', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { backend: { commit_messages: { create: 123 } } }));
      }).toThrowError("'backend.commit_messages.create' must be string");
    });

    it('should throw if media_folder is not defined in config', () => {
      expect(() => {
        validateConfig({ foo: 'bar', backend: { name: 'bar' } });
      }).toThrowError("config must have required property 'media_folder'");
    });

    it('should throw if media_folder is not a string in config', () => {
      expect(() => {
        validateConfig({ foo: 'bar', backend: { name: 'bar' }, media_folder: {} });
      }).toThrowError("'media_folder' must be string");
    });

    it('should throw if collections is not defined in config', () => {
      expect(() => {
        validateConfig({ foo: 'bar', backend: { name: 'bar' }, media_folder: 'baz' });
      }).toThrowError("config must have required property 'collections'");
    });

    it('should throw if collections not an array in config', () => {
      expect(() => {
        validateConfig({
          foo: 'bar',
          backend: { name: 'bar' },
          media_folder: 'baz',
          collections: {},
        });
      }).toThrowError("'collections' must be array");
    });

    it('should throw if collections is an empty array in config', () => {
      expect(() => {
        validateConfig({
          foo: 'bar',
          backend: { name: 'bar' },
          media_folder: 'baz',
          collections: [],
        });
      }).toThrowError("'collections' must NOT have fewer than 1 items");
    });

    it('should throw if collections is an array with a single null element in config', () => {
      expect(() => {
        validateConfig({
          foo: 'bar',
          backend: { name: 'bar' },
          media_folder: 'baz',
          collections: [null],
        });
      }).toThrowError("'collections[0]' must be object");
    });

    it('should throw if local_backend is not a boolean or plain object', () => {
      expect(() => {
        validateConfig({ ...validConfig, local_backend: [] });
      }).toThrowError("'local_backend' must be boolean");
    });

    it('should throw if local_backend url is not a string', () => {
      expect(() => {
        validateConfig({ ...validConfig, local_backend: { url: [] } });
      }).toThrowError("'local_backend.url' must be string");
    });

    it('should throw if local_backend allowed_hosts is not a string array', () => {
      expect(() => {
        validateConfig({ ...validConfig, local_backend: { allowed_hosts: [true] } });
      }).toThrowError("'local_backend.allowed_hosts[0]' must be string");
    });

    it('should not throw if local_backend is a boolean', () => {
      expect(() => {
        validateConfig({ ...validConfig, local_backend: true });
      }).not.toThrowError();
    });

    it('should not throw if local_backend is a plain object with url string property', () => {
      expect(() => {
        validateConfig({ ...validConfig, local_backend: { url: 'http://localhost:8081/api/v1' } });
      }).not.toThrowError();
    });

    it('should not throw if local_backend is a plain object with allowed_hosts string array property', () => {
      expect(() => {
        validateConfig({
          ...validConfig,
          local_backend: { allowed_hosts: ['192.168.0.1'] },
        });
      }).not.toThrowError();
    });

    it('should not throw if slug.sanitize_replacement is a string', () => {
      expect(() => {
        validateConfig({ ...validConfig, slug: { sanitize_replacement: '-' } });
      }).not.toThrowError();
    });

    it('should throw if slug.sanitize_replacement is not a string', () => {
      expect(() => {
        validateConfig({ ...validConfig, slug: { sanitize_replacement: 99 } });
      }).toThrowError("'slug.sanitize_replacement' must be string");
    });

    it('should not throw if collection has media_folder string', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ media_folder: 'assets/img' }] }));
      }).not.toThrow();
    });

    it('should not throw if collection has public_folder string', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ public_folder: '/img' }] }));
      }).not.toThrow();
    });

    it('should throw if collection media_folder is not a string', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ media_folder: 123 }] }));
      }).toThrowError("'collections[0].media_folder' must be string");
    });

    it('should throw if collection publish is not a boolean', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ publish: 'false' }] }));
      }).toThrowError("'collections[0].publish' must be boolean");
    });

    it('should not throw if collection publish is a boolean', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ publish: false }] }));
      }).not.toThrowError();
    });

    it('should throw if collection delete is not a boolean', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ delete: 'no' }] }));
      }).toThrowError("'collections[0].delete' must be boolean");
    });

    it('should not throw if collection delete is a boolean', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ delete: false }] }));
      }).not.toThrowError();
    });

    it('should throw if collections sortable_fields is not a boolean or a string array', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ sortable_fields: 'title' }] }));
      }).toThrowError("'collections[0].sortable_fields' must be array");
    });

    it('should allow sortable_fields to be a string array', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ sortable_fields: ['title'] }] }));
      }).not.toThrow();
    });

    it('should allow sortable_fields to be a an empty array', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ sortable_fields: [] }] }));
      }).not.toThrow();
    });

    it('should allow sortableFields instead of sortable_fields', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ sortableFields: [] }] }));
      }).not.toThrow();
    });

    it('should throw if both sortable_fields and sortableFields exist', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, { collections: [{ sortable_fields: [], sortableFields: [] }] }),
        );
      }).toThrowError("'collections[0]' must NOT be valid");
    });

    it('should allow sortable_fields to have object format with field property', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{ sortable_fields: [{ field: 'title' }] }],
          }),
        );
      }).not.toThrow();
    });

    it('should allow sortable_fields with default_sort as boolean', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{ sortable_fields: [{ field: 'title', default_sort: true }] }],
          }),
        );
      }).not.toThrow();
    });

    it('should allow sortable_fields with default_sort as asc/desc', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{ sortable_fields: ['title', { field: 'date', default_sort: 'desc' }] }],
          }),
        );
      }).not.toThrow();
    });

    it('should allow sortable_fields with custom label', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{ sortable_fields: [{ field: 'date', label: 'Publish Date' }] }],
          }),
        );
      }).not.toThrow();
    });

    it('should allow sortable_fields with label and default_sort', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [
              {
                sortable_fields: [
                  'title',
                  { field: 'date', label: 'Publish Date', default_sort: 'desc' },
                ],
              },
            ],
          }),
        );
      }).not.toThrow();
    });

    it('should allow mixed string and object format in sortable_fields', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{ sortable_fields: ['title', { field: 'date', default_sort: true }] }],
          }),
        );
      }).not.toThrow();
    });

    it('should throw if more than one sortable field has default_sort property', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [
              {
                sortable_fields: [
                  { field: 'title', default_sort: true },
                  { field: 'date', default_sort: true },
                ],
              },
            ],
          }),
        );
      }).toThrowError('only one sortable field can have the default_sort property');
    });

    it('should throw if collection names are not unique', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [validConfig.collections[0], validConfig.collections[0]],
          }),
        );
      }).toThrowError("'collections' collections names must be unique");
    });

    it('should throw if collection file names are not unique', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [
              {},
              {
                files: [
                  {
                    name: 'a',
                    label: 'a',
                    file: 'a.md',
                    fields: [{ name: 'title', label: 'title', widget: 'string' }],
                  },
                  {
                    name: 'a',
                    label: 'b',
                    file: 'b.md',
                    fields: [{ name: 'title', label: 'title', widget: 'string' }],
                  },
                ],
              },
            ],
          }),
        );
      }).toThrowError("'collections[1].files' files names must be unique");
    });

    it('should throw if collection fields names are not unique', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [
              {
                fields: [
                  { name: 'title', label: 'title', widget: 'string' },
                  { name: 'title', label: 'other title', widget: 'string' },
                ],
              },
            ],
          }),
        );
      }).toThrowError("'collections[0].fields' fields names must be unique");
    });

    it('should not throw if collection fields are unique across nesting levels', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [
              {
                fields: [
                  { name: 'title', label: 'title', widget: 'string' },
                  {
                    name: 'object',
                    label: 'Object',
                    widget: 'object',
                    fields: [{ name: 'title', label: 'title', widget: 'string' }],
                  },
                ],
              },
            ],
          }),
        );
      }).not.toThrow();
    });

    describe('nested validation', () => {
      const { getWidgets } = require('../../lib/registry');
      getWidgets.mockImplementation(() => [
        {
          name: 'relation',
          schema: {
            properties: {
              search_fields: { type: 'array', items: { type: 'string' } },
              display_fields: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      ]);

      it('should throw if nested relation display_fields and search_fields are not arrays', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [
                    { name: 'title', label: 'title', widget: 'string' },
                    {
                      name: 'object',
                      label: 'Object',
                      widget: 'object',
                      fields: [
                        { name: 'title', label: 'title', widget: 'string' },
                        {
                          name: 'relation',
                          label: 'relation',
                          widget: 'relation',
                          display_fields: 'title',
                          search_fields: 'title',
                        },
                      ],
                    },
                  ],
                },
              ],
            }),
          );
        }).toThrowError(
          "'collections[0].fields[1].fields[1].search_fields' must be array\n'collections[0].fields[1].fields[1].display_fields' must be array",
        );
      });

      it('should not throw if nested relation display_fields and search_fields are arrays', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [
                    { name: 'title', label: 'title', widget: 'string' },
                    {
                      name: 'object',
                      label: 'Object',
                      widget: 'object',
                      fields: [
                        { name: 'title', label: 'title', widget: 'string' },
                        {
                          name: 'relation',
                          label: 'relation',
                          widget: 'relation',
                          display_fields: ['title'],
                          search_fields: ['title'],
                        },
                      ],
                    },
                  ],
                },
              ],
            }),
          );
        }).not.toThrow();
      });
    });

    it('should throw if collection meta is not a plain object', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ meta: [] }] }));
      }).toThrowError("'collections[0].meta' must be object");
    });

    it('should throw if collection meta is an empty object', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ meta: {} }] }));
      }).toThrowError("'collections[0].meta' must NOT have fewer than 1 properties");
    });

    it('should throw if collection meta is an empty object', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ meta: { path: {} } }] }));
      }).toThrowError("'collections[0].meta.path' must have required property 'label'");
      expect(() => {
        validateConfig(
          merge({}, validConfig, { collections: [{ meta: { path: { label: 'Label' } } }] }),
        );
      }).toThrowError("'collections[0].meta.path' must have required property 'widget'");
    });

    it('should allow collection meta to have a path configuration with index_file', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [
              { meta: { path: { label: 'Path', widget: 'string', index_file: 'index' } } },
            ],
          }),
        );
      }).not.toThrow();
    });

    it('should allow collection meta to have a path configuration without index_file', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{ meta: { path: { label: 'Path', widget: 'string' } } }],
          }),
        );
      }).not.toThrow();
    });

    it('should throw if collection field pattern is not an array', () => {
      expect(() => {
        validateConfig(merge({}, validConfig, { collections: [{ fields: [{ pattern: '' }] }] }));
      }).toThrowError("'collections[0].fields[0].pattern' must be array");
    });

    it('should throw if collection field pattern is not an array of [string|regex, string]', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, { collections: [{ fields: [{ pattern: [1, ''] }] }] }),
        );
      }).toThrowError(
        "'collections[0].fields[0].pattern[0]' must be string\n'collections[0].fields[0].pattern[0]' must be a regular expression",
      );

      expect(() => {
        validateConfig(
          merge({}, validConfig, { collections: [{ fields: [{ pattern: ['', 1] }] }] }),
        );
      }).toThrowError("'collections[0].fields[0].pattern[1]' must be string");
    });

    it('should allow collection field pattern to be an array of [string|regex, string]', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{ fields: [{ pattern: ['pattern', 'error'] }] }],
          }),
        );
      }).not.toThrow();

      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{ fields: [{ pattern: [/pattern/, 'error'] }] }],
          }),
        );
      }).not.toThrow();
    });

    describe('collection filter', () => {
      it('should not throw if collection filter has field and value', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [{ filter: { field: 'type', value: 'post' } }],
            }),
          );
        }).not.toThrow();
      });

      it('should throw if collection filter is missing value', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [{ filter: { field: 'type' } }],
            }),
          );
        }).toThrowError("'collections[0].filter' must have required property 'value'");
      });
    });

    describe('field comment property', () => {
      it('should not throw if field has comment as a string', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [{ name: 'title', label: 'Title', widget: 'string', comment: 'My hint' }],
                },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('should throw if field comment is not a string', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [{ name: 'title', label: 'Title', widget: 'string', comment: 123 }],
                },
              ],
            }),
          );
        }).toThrowError("'collections[0].fields[0].comment' must be string");
      });
    });

    describe('field tagname property', () => {
      it('should not throw if field has tagname as a string', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [{ name: 'title', label: 'Title', widget: 'string', tagname: 'h2' }],
                },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('should throw if field tagname is not a string', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [{ name: 'title', label: 'Title', widget: 'string', tagname: 42 }],
                },
              ],
            }),
          );
        }).toThrowError("'collections[0].fields[0].tagname' must be string");
      });
    });

    describe('field class property', () => {
      it('should not throw if field has class as a string', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [{ name: 'title', label: 'Title', widget: 'string', class: 'my-widget' }],
                },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('should throw if field class is not a string', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [{ name: 'title', label: 'Title', widget: 'string', class: true }],
                },
              ],
            }),
          );
        }).toThrowError("'collections[0].fields[0].class' must be string");
      });
    });

    describe('frontmatter_delimiter dependency', () => {
      it('should throw if frontmatter_delimiter is set without format', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [{ frontmatter_delimiter: '---' }],
            }),
          );
        }).toThrowError();
      });

      it('should not throw if frontmatter_delimiter is set with a valid frontmatter format', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [{ frontmatter_delimiter: '---', format: 'yaml-frontmatter' }],
            }),
          );
        }).not.toThrowError();
      });

      it('should throw if frontmatter_delimiter is set with a non-frontmatter format', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [{ frontmatter_delimiter: '---', format: 'toml' }],
            }),
          );
        }).toThrowError();
      });
    });

    describe('extension/format conditional', () => {
      it('should throw if extension is unknown and format is not provided', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [{ extension: 'custom' }],
            }),
          );
        }).toThrowError();
      });

      it('should not throw if extension is unknown but format is provided', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [{ extension: 'custom', format: 'yaml' }],
            }),
          );
        }).not.toThrowError();
      });

      it('should not throw if extension is a known extension and format is not provided', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [{ extension: 'md' }],
            }),
          );
        }).not.toThrowError();
      });
    });

    describe('view_filters / view_groups', () => {
      it('should not throw for valid view_filters with boolean pattern', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  view_filters: [{ label: 'Drafts', field: 'draft', pattern: true }],
                },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('should not throw for valid view_filters with string pattern', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  view_filters: [{ label: 'Featured', field: 'featured', pattern: 'yes' }],
                },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('should throw if view_filters item is missing pattern', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  view_filters: [{ label: 'Drafts', field: 'draft' }],
                },
              ],
            }),
          );
        }).toThrowError("'collections[0].view_filters[0]' must have required property 'pattern'");
      });

      it('should not throw for valid view_groups without pattern (optional)', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  view_groups: [{ label: 'Year', field: 'date' }],
                },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('should throw if view_groups item has non-string pattern', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  view_groups: [{ label: 'Year', field: 'date', pattern: true }],
                },
              ],
            }),
          );
        }).toThrowError("'collections[0].view_groups[0].pattern' must be string");
      });

      it('should throw if view_filters is an empty array (minItems: 1)', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [{ view_filters: [] }],
            }),
          );
        }).toThrowError("'collections[0].view_filters' must NOT have fewer than 1 items");
      });
    });

    describe('collection editor', () => {
      it('should not throw when editor is absent', () => {
        expect(() => {
          validateConfig(merge({}, validConfig));
        }).not.toThrow();
      });

      it('should not throw when editor.preview is true', () => {
        expect(() => {
          validateConfig(merge({}, validConfig, { collections: [{ editor: { preview: true } }] }));
        }).not.toThrow();
      });

      it('should not throw when editor.preview is false', () => {
        expect(() => {
          validateConfig(merge({}, validConfig, { collections: [{ editor: { preview: false } }] }));
        }).not.toThrow();
      });

      it('should throw when editor.preview is not a boolean', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, { collections: [{ editor: { preview: 'true' } }] }),
          );
        }).toThrowError("'collections[0].editor.preview' must be boolean");
      });

      it('should not throw when editor.visualEditing is true', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, { collections: [{ editor: { visualEditing: true } }] }),
          );
        }).not.toThrow();
      });

      it('should not throw when editor.visualEditing is false', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, { collections: [{ editor: { visualEditing: false } }] }),
          );
        }).not.toThrow();
      });

      it('should throw when editor.visualEditing is not a boolean', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, { collections: [{ editor: { visualEditing: 'yes' } }] }),
          );
        }).toThrowError("'collections[0].editor.visualEditing' must be boolean");
      });
    });

    describe('i18n', () => {
      it('should throw error when locale has invalid characters', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              i18n: {
                structure: 'multiple_folders',
                locales: ['en', 'tr.TR'],
              },
            }),
          );
        }).toThrowError(`'i18n.locales[1]' must match pattern "^[a-zA-Z-_]+$"`);
      });

      it('should throw error when locale is less than 2 characters', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              i18n: {
                structure: 'multiple_folders',
                locales: ['en', 't'],
              },
            }),
          );
        }).toThrowError(`'i18n.locales[1]' must NOT have fewer than 2 characters`);
      });

      it('should throw error when locale is more than 10 characters', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              i18n: {
                structure: 'multiple_folders',
                locales: ['en', 'a_very_long_locale'],
              },
            }),
          );
        }).toThrowError(`'i18n.locales[1]' must NOT have more than 10 characters`);
      });

      it('should throw error when locales is less than 1 items', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              i18n: {
                structure: 'multiple_folders',
                locales: [],
              },
            }),
          );
        }).toThrowError(`'i18n.locales' must NOT have fewer than 1 items`);
      });

      it('should allow valid locales strings', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              i18n: {
                structure: 'multiple_folders',
                locales: ['en', 'tr-TR', 'zh_CHS'],
              },
            }),
          );
        }).not.toThrow();
      });

      it('should not throw when list field has i18n: "duplicate"', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [
                    {
                      name: 'items',
                      label: 'Items',
                      widget: 'list',
                      i18n: 'duplicate',
                    },
                  ],
                },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('should not throw when list field has i18n: "translate"', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [
                    {
                      name: 'items',
                      label: 'Items',
                      widget: 'list',
                      i18n: 'translate',
                    },
                  ],
                },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('should not throw when list field has i18n: "none"', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [
                    {
                      name: 'items',
                      label: 'Items',
                      widget: 'list',
                      i18n: 'none',
                    },
                  ],
                },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('should not throw when object field has i18n: "duplicate"', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [
                    {
                      name: 'meta',
                      label: 'Meta',
                      widget: 'object',
                      i18n: 'duplicate',
                      fields: [{ name: 'title', label: 'Title', widget: 'string' }],
                    },
                  ],
                },
              ],
            }),
          );
        }).not.toThrow();
      });
    });
  });
});

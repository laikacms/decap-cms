vi.mock('../registry');

import { merge } from 'lodash-es';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getEntryCodec, getEntryCodecs, getWidgets } from '@/core/lib/registry';
import { getConfigSchema, validateConfig } from '@/core/lib/validateConfig';
import { jsonEntryCodec, jsonFrontmatterCodec } from '@/entry-codecs/json/index';
import { createMarkdownEntryCodec } from '@/entry-codecs/markdown/index';
import { tomlEntryCodec, tomlFrontmatterCodec } from '@/entry-codecs/toml/index';
import { yamlEntryCodec, yamlFrontmatterCodec } from '@/entry-codecs/yaml/index';
import booleanSchema from '@/widgets/boolean/schema';
import fileSchema from '@/widgets/file/schema';
import imageSchema from '@/widgets/image/schema';

// The registry is automocked; give the entry-format getters the state the fat
// entries produce at runtime (all three built-in packs registered).
const entryCodecs = [
  yamlEntryCodec,
  tomlEntryCodec,
  jsonEntryCodec,
  createMarkdownEntryCodec({ frontmatter: [yamlFrontmatterCodec, tomlFrontmatterCodec, jsonFrontmatterCodec] }),
];
vi.mocked(getEntryCodecs).mockImplementation(() => entryCodecs);
vi.mocked(getEntryCodec).mockImplementation(
  name => entryCodecs.find(pack => pack.name === name || pack.aliases?.includes(name)),
);

describe('config', () => {
  /**
   * Suppress error logging to reduce noise during testing. Vitest will still
   * log test failures and associated errors as expected.
   */
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  vi.mocked(getWidgets).mockImplementation(() => [{}]);

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

    it('should throw if backend.name is "laika" and base_url is missing (DCMS-1786)', () => {
      expect(() => {
        validateConfig({ ...validConfig, backend: { name: 'laika' } });
      }).toThrowError("'backend' must have required property 'base_url'");
    });

    it('should throw if backend.name is "laika" and base_url is an empty string (DCMS-1786)', () => {
      expect(() => {
        validateConfig({ ...validConfig, backend: { name: 'laika', base_url: '' } });
      }).toThrowError();
    });

    it('should not throw if backend.name is "laika" and base_url is a non-empty string (DCMS-1786)', () => {
      expect(() => {
        validateConfig({
          ...validConfig,
          backend: { name: 'laika', base_url: 'https://laika.example.com' },
        });
      }).not.toThrowError();
    });

    it('should not require base_url for non-laika backends (DCMS-1786)', () => {
      expect(() => {
        validateConfig({ ...validConfig, backend: { name: 'github' } });
      }).not.toThrowError();
    });

    it('should throw if backend.name is "proxy" and proxy_url is missing (DCMS-1848)', () => {
      expect(() => {
        validateConfig({ ...validConfig, backend: { name: 'proxy' } });
      }).toThrowError("'backend' must have required property 'proxy_url'");
    });

    it('should throw if backend.name is "proxy" and proxy_url is an empty string (DCMS-1848)', () => {
      expect(() => {
        validateConfig({ ...validConfig, backend: { name: 'proxy', proxy_url: '' } });
      }).toThrowError();
    });

    it('should throw if backend.name is "proxy" and proxy_url is not http(s) or root-relative (DCMS-1848)', () => {
      expect(() => {
        validateConfig({ ...validConfig, backend: { name: 'proxy', proxy_url: 'not-a-url' } });
      }).toThrowError();
    });

    it('should not throw if backend.name is "proxy" and proxy_url is an http(s) URL (DCMS-1848)', () => {
      expect(() => {
        validateConfig({
          ...validConfig,
          backend: { name: 'proxy', proxy_url: 'https://proxy.example.com' },
        });
      }).not.toThrowError();
    });

    it('should not throw if backend.name is "proxy" and proxy_url is root-relative (DCMS-1848)', () => {
      expect(() => {
        validateConfig({ ...validConfig, backend: { name: 'proxy', proxy_url: '/api/v1' } });
      }).not.toThrowError();
    });

    it('should not require proxy_url for non-proxy backends (DCMS-1848)', () => {
      expect(() => {
        validateConfig({ ...validConfig, backend: { name: 'github' } });
      }).not.toThrowError();
    });

    it('throws on publish_mode editorial_workflow for backend name local-fs (DCMS-1860)', () => {
      expect(() => {
        validateConfig({
          ...validConfig,
          backend: { name: 'local-fs' },
          publish_mode: 'editorial_workflow',
        });
      }).toThrowError(
        "backend 'local-fs' does not support publish_mode 'editorial_workflow' - use publish_mode: simple (or omit it) or choose a git-based backend",
      );
    });

    it('accepts publish_mode simple for local-fs (DCMS-1860)', () => {
      expect(() => {
        validateConfig({
          ...validConfig,
          backend: { name: 'local-fs' },
          publish_mode: 'simple',
        });
      }).not.toThrowError();
    });

    it('does not require a publish_mode at all for local-fs (DCMS-1860)', () => {
      expect(() => {
        validateConfig({ ...validConfig, backend: { name: 'local-fs' } });
      }).not.toThrowError();
    });

    it('does not reject editorial_workflow for non-local-fs backends (DCMS-1860)', () => {
      expect(() => {
        validateConfig({
          ...validConfig,
          backend: { name: 'github' },
          publish_mode: 'editorial_workflow',
        });
      }).not.toThrowError();
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

    it('allows collection view_scopes and edit_scopes string arrays', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{
              view_scopes: ['content:read'],
              edit_scopes: ['content:write'],
            }],
          }),
        );
      }).not.toThrowError();
    });

    it('rejects non-string collection scopes', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{ edit_scopes: ['content:write', 42] }],
          }),
        );
      }).toThrowError("'collections[0].edit_scopes[1]' must be string");
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

    it('should allow collection search_fields to be a non-empty string array', () => {
      expect(() => validateConfig(merge({}, validConfig, { collections: [{ search_fields: ['title', 'author'] }] })))
        .not.toThrow();
    });

    it('should reject invalid collection search_fields', () => {
      expect(() => validateConfig(merge({}, validConfig, { collections: [{ search_fields: 'title' }] }))).toThrowError(
        "'collections[0].search_fields' must be array",
      );
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
      vi.mocked(getWidgets).mockImplementation(() => [
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

    describe('boolean widget schema (DCMS-1874)', () => {
      beforeEach(() => {
        vi.mocked(getWidgets).mockImplementation(() => [{ name: 'boolean', schema: booleanSchema }]);
      });

      afterEach(() => {
        vi.mocked(getWidgets).mockImplementation(() => [{}]);
      });

      it('should throw if boolean field default is not a boolean', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [{ name: 'x', label: 'x', widget: 'boolean', default: 'not-a-bool' }],
                },
              ],
            }),
          );
        }).toThrowError("'collections[0].fields[0].default' must be boolean");
      });

      it('should not throw if boolean field default is a boolean', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [{ name: 'x', label: 'x', widget: 'boolean', default: true }],
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

    it('should throw if collection field visualEditing is not a boolean', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{ fields: [{ visualEditing: 'not-a-bool' }] }],
          }),
        );
      }).toThrowError("'collections[0].fields[0].visualEditing' must be boolean");
    });

    it('should allow collection field visualEditing to be a boolean', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{ fields: [{ visualEditing: false }] }],
          }),
        );
      }).not.toThrow();
    });

    it('should throw if collection editor.visualEditing is not a boolean', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{ editor: { visualEditing: 'not-a-bool' } }],
          }),
        );
      }).toThrowError("'collections[0].editor.visualEditing' must be boolean");
    });

    it('should allow collection editor.visualEditing to be a boolean', () => {
      expect(() => {
        validateConfig(
          merge({}, validConfig, {
            collections: [{ editor: { visualEditing: false } }],
          }),
        );
      }).not.toThrow();
    });

    describe('collection.nested schema (docs pinning, DCMS-1101)', () => {
      // Pins the `nested` JSON schema against packages/decap-cms/src/core/README.md's
      // `collection.nested` section: if this test breaks, the schema changed and the
      // README section needs to be updated to match (and vice versa).
      it('documents exactly depth (required), subfolders, and summary', () => {
        const nestedSchema = (getConfigSchema().properties as any).collections.items.properties
          .nested;

        expect(nestedSchema.type).toBe('object');
        expect(Object.keys(nestedSchema.properties).sort()).toEqual([
          'depth',
          'subfolders',
          'summary',
        ]);
        expect(nestedSchema.required).toEqual(['depth']);
        expect(nestedSchema.properties.depth).toEqual({
          type: 'number',
          minimum: 1,
          maximum: 1000,
        });
        expect(nestedSchema.properties.subfolders).toEqual({ type: 'boolean' });
        expect(nestedSchema.properties.summary).toEqual({ type: 'string' });
      });

      it('accepts a valid nested config', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  nested: { depth: 5, subfolders: true, summary: '{{title}}' },
                },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('throws when nested.depth is missing', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [{ nested: { subfolders: true } }],
            }),
          );
        }).toThrowError("'collections[0].nested' must have required property 'depth'");
      });
    });

    describe('asset_collections (DCMS-1412)', () => {
      it('accepts a minimal asset collection (name, label, media_folder)', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              asset_collections: [
                { name: 'photos', label: 'Photos', media_folder: 'static/uploads/photos' },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('accepts the full asset collection shape', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              asset_collections: [
                {
                  name: 'photos',
                  label: 'Photos',
                  label_singular: 'Photo',
                  description: 'Site photography',
                  media_folder: 'static/uploads/photos',
                  public_folder: '/uploads/photos',
                  allowed_file_types: ['jpg', 'png', 'webp'],
                  filename_template: '{{entry_slug}}-{{index}}.{{extension}}',
                },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('throws when an asset collection is missing name', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              asset_collections: [{ label: 'Photos', media_folder: 'static/uploads/photos' }],
            }),
          );
        }).toThrowError("'asset_collections[0]' must have required property 'name'");
      });

      it('throws when an asset collection is missing label', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              asset_collections: [{ name: 'photos', media_folder: 'static/uploads/photos' }],
            }),
          );
        }).toThrowError("'asset_collections[0]' must have required property 'label'");
      });

      it('throws when an asset collection is missing media_folder', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              asset_collections: [{ name: 'photos', label: 'Photos' }],
            }),
          );
        }).toThrowError("'asset_collections[0]' must have required property 'media_folder'");
      });

      it('throws when two asset collections share a name', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              asset_collections: [
                { name: 'photos', label: 'Photos', media_folder: 'a' },
                { name: 'photos', label: 'Photos 2', media_folder: 'b' },
              ],
            }),
          );
        }).toThrowError("'asset_collections' must pass \"uniqueItemProperties\" keyword validation");
      });

      it('is optional: config without asset_collections still validates', () => {
        expect(() => {
          validateConfig(validConfig);
        }).not.toThrow();
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
    });

    describe('field_groups', () => {
      it('allows a top-level field_groups map', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              field_groups: {
                seo: [{ name: 'seo_title', label: 'SEO Title', widget: 'string' }],
              },
            }),
          );
        }).not.toThrow();
      });

      it('allows a `{ group }` reference in place of a regular field', () => {
        expect(() => {
          validateConfig({
            ...validConfig,
            field_groups: {
              seo: [{ name: 'seo_title', label: 'SEO Title', widget: 'string' }],
            },
            collections: [
              {
                name: 'posts',
                label: 'Posts',
                folder: '_posts',
                fields: [{ group: 'seo' }],
              },
            ],
          });
        }).not.toThrow();
      });

      describe('file/image media_library schema (DCMS-1875)', () => {
      it('throws if file widget media_library.allow_multiple is not a boolean', () => {
        vi.mocked(getWidgets).mockImplementation(() => [
          { name: 'file', schema: fileSchema },
        ]);
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [
                    { name: 'x', widget: 'file', media_library: { allow_multiple: 'yes' } },
                  ],
                },
              ],
            }),
          );
        }).toThrowError("'collections[0].fields[0].media_library.allow_multiple' must be boolean");
      });

      it('does not throw if file widget media_library.allow_multiple is a boolean', () => {
        vi.mocked(getWidgets).mockImplementation(() => [
          { name: 'file', schema: fileSchema },
        ]);
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [
                    { name: 'x', widget: 'file', media_library: { allow_multiple: true } },
                  ],
                },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('throws if image widget media_library.allow_multiple is not a boolean', () => {
        vi.mocked(getWidgets).mockImplementation(() => [
          { name: 'image', schema: imageSchema },
        ]);
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [
                    { name: 'x', widget: 'image', media_library: { allow_multiple: 'yes' } },
                  ],
                },
              ],
            }),
          );
        }).toThrowError("'collections[0].fields[0].media_library.allow_multiple' must be boolean");
      });
    });

    it('still throws if a field has neither name nor group', () => {
        expect(() => {
          validateConfig({
            ...validConfig,
            collections: [
              {
                name: 'posts',
                label: 'Posts',
                folder: '_posts',
                fields: [{ label: 'Title', widget: 'string' }],
              },
            ],
          });
        }).toThrowError(/must match exactly one schema in oneOf/);
      });
    });

    // DCMS-1974: `editor_components`/`editorComponents` configured the
    // pre-Lexical markdown widget's custom-block API, which was removed.
    // Neither key is declared in the richtext widget schema and
    // `additionalProperties: false` is deliberately not set anywhere (see
    // the issue's "out of scope"), so schema validation alone can't reject
    // them - `checkRichtextFieldKeys` in `validateConfig.ts` does it as a
    // dedicated custom check, same pattern as the local-fs check above.
    describe('richtext removed/inert keys (DCMS-1974)', () => {
      const richtextConfig = (extra: Record<string, unknown>) =>
        merge({}, validConfig, {
          collections: [
            {
              fields: [{ name: 'body', widget: 'richtext', ...extra }],
            },
          ],
        });

      it('throws when a richtext field sets editor_components', () => {
        expect(() => {
          validateConfig(richtextConfig({ editor_components: ['image'] }));
        }).toThrowError(
          "richtext field 'body' sets 'editor_components', which was removed in v4. Register custom "
            + 'blocks with CMS.registerBlock(...) before init().',
        );
      });

      it('throws when a richtext field sets the camelCase editorComponents alias', () => {
        expect(() => {
          validateConfig(richtextConfig({ editorComponents: ['image'] }));
        }).toThrowError(
          "richtext field 'body' sets 'editorComponents', which was removed in v4. Register custom "
            + 'blocks with CMS.registerBlock(...) before init().',
        );
      });

      it('does not throw for a richtext field without editor_components', () => {
        expect(() => {
          validateConfig(richtextConfig({ format: 'markdown' }));
        }).not.toThrow();
      });

      it('does not throw when a non-richtext field sets editor_components', () => {
        expect(() => {
          validateConfig(
            merge({}, validConfig, {
              collections: [
                {
                  fields: [{ name: 'body', widget: 'string', editor_components: ['image'] }],
                },
              ],
            }),
          );
        }).not.toThrow();
      });

      it('warns once per inert key (minimal, buttons, modes, sanitize_preview)', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
          validateConfig(
            richtextConfig({ minimal: true, buttons: ['bold'], modes: ['rich_text'], sanitize_preview: false }),
          );
          const messages = warnSpy.mock.calls.map(call => String(call[0]));
          expect(messages.some(m => m.includes("'minimal'"))).toBe(true);
          expect(messages.some(m => m.includes("'buttons'"))).toBe(true);
          expect(messages.some(m => m.includes("'modes'"))).toBe(true);
          expect(messages.some(m => m.includes('sanitize_preview'))).toBe(true);
        } finally {
          warnSpy.mockRestore();
        }
      });

      it('does not throw for the inert-but-declared keys', () => {
        expect(() => {
          validateConfig(
            richtextConfig({ minimal: true, buttons: ['bold'], modes: ['rich_text'], sanitize_preview: false }),
          );
        }).not.toThrow();
      });
    });
  });
});

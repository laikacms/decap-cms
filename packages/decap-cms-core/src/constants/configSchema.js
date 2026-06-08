import AJV from 'ajv';
import {
  select,
  uniqueItemProperties,
  instanceof as instanceOf,
  prohibited,
} from 'ajv-keywords/dist/keywords';
import ajvErrors from 'ajv-errors';

import { frontmatterFormats, extensionFormatters } from '../formats/formats';
import { getWidgets } from '../lib/registry';
import { I18N_STRUCTURE, I18N_FIELD } from '../lib/i18n';

const localeType = { type: 'string', minLength: 2, maxLength: 10, pattern: '^[a-zA-Z-_]+$' };

const i18n = {
  type: 'object',
  properties: {
    structure: { type: 'string', enum: Object.values(I18N_STRUCTURE) },
    locales: {
      type: 'array',
      minItems: 1,
      items: localeType,
      uniqueItems: true,
    },
    default_locale: localeType,
  },
};

const i18nRoot = {
  ...i18n,
  required: ['structure', 'locales'],
};

const i18nCollection = {
  oneOf: [{ type: 'boolean' }, i18n],
};

const i18nField = {
  oneOf: [{ type: 'boolean' }, { type: 'string', enum: Object.values(I18N_FIELD) }],
};

/**
 * Config for fields in both file and folder collections.
 */
function fieldsConfig() {
  const id = crypto.randomUUID();
  return {
    $id: `fields_${id}`,
    type: 'array',
    minItems: 1,
    items: {
      // ------- Each field: -------
      $id: `field_${id}`,
      type: 'object',
      properties: {
        name: { type: 'string' },
        label: { type: 'string' },
        widget: { type: 'string' },
        required: { type: 'boolean' },
        i18n: i18nField,
        hint: { type: 'string' },
        pattern: {
          type: 'array',
          minItems: 2,
          maxItems: 2,
          items: [{ oneOf: [{ type: 'string' }, { instanceof: 'RegExp' }] }, { type: 'string' }],
        },
        media_folder: { type: 'string' },
        public_folder: { type: 'string' },
        comment: { type: 'string' },
        field: { $ref: `field_${id}` },
        fields: { $ref: `fields_${id}` },
        types: { $ref: `fields_${id}` },
        visualEditing: { type: 'boolean' },
        tagname: { type: 'string' },
      },
      select: { $data: '0/widget' },
      selectCases: {
        ...getWidgetSchemas(),
      },
      required: ['name'],
    },
    uniqueItemProperties: ['name'],
  };
}

const viewFilters = {
  type: 'array',
  minItems: 1,
  items: {
    type: 'object',
    properties: {
      label: { type: 'string' },
      field: { type: 'string' },
      pattern: {
        oneOf: [
          { type: 'boolean' },
          {
            type: 'string',
          },
        ],
      },
    },
    additionalProperties: false,
    required: ['label', 'field', 'pattern'],
  },
};

const viewGroups = {
  type: 'array',
  minItems: 1,
  items: {
    type: 'object',
    properties: {
      label: { type: 'string' },
      field: { type: 'string' },
      pattern: { type: 'string' },
    },
    additionalProperties: false,
    required: ['label', 'field'],
  },
};

/**
 * The schema had to be wrapped in a function to
 * fix a circular dependency problem for WebPack,
 * where the imports get resolved asynchronously.
 */
function getConfigSchema() {
  return {
    type: 'object',
    properties: {
      backend: {
        type: 'object',
        properties: {
          name: { type: 'string', examples: ['test-repo'] },
          repo: { type: 'string' },
          branch: { type: 'string' },
          auth_scope: {
            type: 'string',
            examples: ['repo', 'public_repo'],
            enum: ['repo', 'public_repo'],
          },
          cms_label_prefix: { type: 'string', minLength: 1 },
          open_authoring: { type: 'boolean', examples: [true] },
          use_graphql: { type: 'boolean' },
          graphql_api_root: { type: 'string' },
          commit_messages: {
            type: 'object',
            properties: {
              create: { type: 'string' },
              update: { type: 'string' },
              delete: { type: 'string' },
              uploadMedia: { type: 'string' },
              deleteMedia: { type: 'string' },
              openAuthoring: { type: 'string' },
            },
            additionalProperties: false,
          },
          auth_type: { type: 'string', enum: ['pkce', 'implicit'] },
          signoff_commits: { type: 'boolean' },
          squash_merges: { type: 'boolean' },
          preview_context: { type: 'string' },
          always_fork: { type: 'boolean' },
          api_root: { type: 'string' },
          base_url: { type: 'string' },
          auth_endpoint: { type: 'string' },
          auth_token_endpoint: { type: 'string' },
          app_id: { type: 'string' },
          large_media_url: { type: 'string' },
          proxy_url: { type: 'string' },
          gateway_url: { type: 'string' },
          status_endpoint: { type: 'string' },
          status_component_name: { type: 'string' },
          status_page: { type: 'string' },
          identity_url: { type: 'string' },
          use_large_media_transforms_in_media_library: { type: 'boolean' },
          netlify_api_token: { type: 'string' },
        },
        required: ['name'],
        if: { properties: { name: { const: 'proxy' } }, required: ['name'] },
        then: { required: ['proxy_url'] },
      },
      local_backend: {
        oneOf: [
          { type: 'boolean' },
          {
            type: 'object',
            properties: {
              url: { type: 'string', examples: ['http://localhost:8081/api/v1'] },
              allowed_hosts: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            additionalProperties: false,
          },
        ],
      },
      locale: { type: 'string', examples: ['en', 'fr', 'de'] },
      i18n: i18nRoot,
      site_url: { type: 'string', examples: ['https://example.com'] },
      display_url: { type: 'string', examples: ['https://example.com'] },
      logo_url: { type: 'string', examples: ['https://example.com/images/logo.svg'] }, // Deprecated, replaced by `logo.src`
      logo: {
        type: 'object',
        properties: {
          src: { type: 'string', examples: ['https://example.com/images/logo.svg'] },
          show_in_header: { type: 'boolean' },
        },
        required: ['src'],
      },
      show_preview_links: { type: 'boolean' },
      media_folder: { type: 'string', examples: ['assets/uploads'] },
      public_folder: { type: 'string', examples: ['/uploads'] },
      media_library: {
        type: 'object',
        properties: {
          name: { type: 'string', examples: ['uploadcare'] },
          config: { type: 'object' },
        },
        required: ['name'],
      },
      publish_mode: {
        type: 'string',
        enum: ['simple', 'editorial_workflow', ''],
        examples: ['editorial_workflow'],
      },
      slug: {
        type: 'object',
        properties: {
          encoding: { type: 'string', enum: ['unicode', 'ascii'] },
          clean_accents: { type: 'boolean' },
          sanitize_replacement: { type: 'string' },
          max_length: { type: 'number', examples: [100] },
        },
      },
      issue_reports: {
        type: 'object',
        properties: {
          url: { type: 'string', examples: ['https://example.com/report-issue'] },
        },
      },
      collections: {
        type: 'array',
        minItems: 1,
        items: {
          // ------- Each collection: -------
          type: 'object',
          properties: {
            name: { type: 'string' },
            label: { type: 'string' },
            label_singular: { type: 'string' },
            description: { type: 'string' },
            folder: { type: 'string' },
            files: {
              type: 'array',
              items: {
                // ------- Each file: -------
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  label: { type: 'string' },
                  label_singular: { type: 'string' },
                  description: { type: 'string' },
                  file: { type: 'string' },
                  preview_path: { type: 'string' },
                  preview_path_date_field: { type: 'string' },
                  // When `true`, preserves `/` in sanitized `preview_path` template
                  // segments (e.g. `{{dirname}}`) instead of stripping/replacing them.
                  // Defaults to `false` unless the collection is `nested`.
                  preview_path_preserve_slashes: { type: 'boolean' },
                  media_folder: { type: 'string' },
                  public_folder: { type: 'string' },
                  fields: fieldsConfig(),
                },
                required: ['name', 'label', 'file', 'fields'],
              },
              uniqueItemProperties: ['name'],
            },
            media_folder: { type: 'string' },
            public_folder: { type: 'string' },
            identifier_field: { type: 'string' },
            summary: { type: 'string' },
            slug: { type: 'string' },
            path: { type: 'string' },
            preview_path: { type: 'string' },
            preview_path_date_field: { type: 'string' },
            // When `true`, preserves `/` in sanitized `preview_path` template
            // segments (e.g. `{{dirname}}`) instead of stripping/replacing them.
            // Defaults to `false` unless the collection is `nested` (nested
            // collections preserve slashes by default even without setting
            // this option explicitly).
            preview_path_preserve_slashes: { type: 'boolean' },
            create: { type: 'boolean' },
            publish: { type: 'boolean' },
            hide: { type: 'boolean' },
            delete: { type: 'boolean' },
            editor: {
              type: 'object',
              properties: {
                preview: { type: 'boolean' },
                visualEditing: { type: 'boolean' },
              },
            },
            format: { type: 'string' },
            extension: { type: 'string' },
            frontmatter_delimiter: {
              type: ['string', 'array'],
              minItems: 2,
              maxItems: 2,
              items: {
                type: 'string',
              },
            },
            fields: fieldsConfig(),
            sortable_fields: {
              type: 'array',
              items: {
                oneOf: [
                  { type: 'string' },
                  {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      label: { type: 'string' },
                      default_sort: {
                        type: 'string',
                        enum: ['asc', 'desc'],
                      },
                    },
                    required: ['field'],
                    additionalProperties: false,
                  },
                ],
              },
            },
            sortableFields: {
              type: 'array',
              items: {
                oneOf: [
                  { type: 'string' },
                  {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      label: { type: 'string' },
                      default_sort: {
                        oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['asc', 'desc'] }],
                      },
                    },
                    required: ['field'],
                    additionalProperties: false,
                  },
                ],
              },
            },
            search_fields: {
              type: 'array',
              items: { type: 'string' },
            },
            view_filters: viewFilters,
            view_groups: viewGroups,
            nested: {
              type: 'object',
              properties: {
                depth: { type: 'number', minimum: 1, maximum: 1000 },
                subfolders: { type: 'boolean' },
                summary: { type: 'string' },
              },
              required: ['depth'],
            },
            meta: {
              type: 'object',
              properties: {
                path: {
                  type: 'object',
                  properties: {
                    label: { type: 'string' },
                    widget: { type: 'string' },
                    index_file: { type: 'string' },
                  },
                  required: ['label', 'widget'],
                },
              },
              additionalProperties: false,
              minProperties: 1,
            },
            i18n: i18nCollection,
            filter: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                value: {},
              },
              required: ['field', 'value'],
              additionalProperties: false,
            },
          },
          required: ['name', 'label'],
          oneOf: [{ required: ['files'] }, { required: ['folder', 'fields'] }],
          not: {
            required: ['sortable_fields', 'sortableFields'],
          },
          if: { required: ['extension'] },
          then: {
            // Cannot infer format from extension.
            if: {
              properties: {
                extension: { enum: Object.keys(extensionFormatters) },
              },
            },
            else: { required: ['format'] },
          },
          dependencies: {
            frontmatter_delimiter: {
              properties: {
                format: { enum: frontmatterFormats },
              },
              required: ['format'],
            },
          },
        },
        uniqueItemProperties: ['name'],
      },
      integrations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            hooks: {
              type: 'array',
              items: { type: 'string' },
            },
            provider: { type: 'string' },
            collections: {
              oneOf: [
                { type: 'string', enum: ['*'] },
                { type: 'array', items: { type: 'string' } },
              ],
            },
            applicationID: { type: 'string' },
            apiKey: { type: 'string' },
            getSignedFormURL: { type: 'string' },
          },
          required: ['hooks', 'provider'],
        },
      },
      auth: {
        type: 'object',
        properties: {
          use_oidc: { type: 'boolean' },
          base_url: { type: 'string' },
          auth_endpoint: { type: 'string' },
          auth_token_endpoint: { type: 'string' },
          app_id: { type: 'string' },
          scope: { type: 'string' },
          auth_token_endpoint_content_type: { type: 'string' },
          email_claim: { type: 'string' },
          full_name_claim: { type: 'string' },
          first_name_claim: { type: 'string' },
          last_name_claim: { type: 'string' },
          avatar_url_claim: { type: 'string' },
        },
        additionalProperties: false,
      },
      editor: {
        type: 'object',
        properties: {
          preview: { type: 'boolean' },
          visualEditing: { type: 'boolean' },
        },
      },
      search: { type: 'boolean' },
    },
    required: ['backend', 'collections'],
    anyOf: [{ required: ['media_folder'] }, { required: ['media_library'] }],
  };
}

function getWidgetSchemas() {
  const schemas = getWidgets().map(widget => ({ [widget.name]: widget.schema }));
  return Object.assign(...schemas);
}

class ConfigError extends Error {
  constructor(errors, ...args) {
    const message = errors
      .map(({ message, instancePath }) => {
        const dotPath = instancePath
          .slice(1)
          .split('/')
          .map(seg => (seg.match(/^\d+$/) ? `[${seg}]` : `.${seg}`))
          .join('')
          .slice(1);
        return `${dotPath ? `'${dotPath}'` : 'config'} ${message}`;
      })
      .join('\n');
    super(message, ...args);

    this.errors = errors;
    this.message = message;
  }

  toString() {
    return this.message;
  }
}

/**
 * `validateConfig` is a pure function. It does not mutate
 * the config that is passed in.
 */
export function validateConfig(config) {
  const ajv = new AJV({ allErrors: true, $data: true, strict: false });
  uniqueItemProperties(ajv);
  select(ajv);
  instanceOf(ajv);
  prohibited(ajv);
  ajvErrors(ajv);

  const valid = ajv.validate(getConfigSchema(), config);
  if (!valid) {
    const errors = ajv.errors.map(e => {
      switch (e.keyword) {
        // TODO: remove after https://github.com/ajv-validator/ajv-keywords/pull/123 is merged
        case 'uniqueItemProperties': {
          const path = e.instancePath || '';
          let newError = e;
          if (path.endsWith('/fields')) {
            newError = { ...e, message: 'fields names must be unique' };
          } else if (path.endsWith('/files')) {
            newError = { ...e, message: 'files names must be unique' };
          } else if (path.endsWith('/collections')) {
            newError = { ...e, message: 'collections names must be unique' };
          }
          return newError;
        }
        case 'instanceof': {
          const path = e.instancePath || '';
          let newError = e;
          if (/fields\/\d+\/pattern\/\d+/.test(path)) {
            newError = {
              ...e,
              message: 'must be a regular expression',
            };
          }
          return newError;
        }
        default:
          return e;
      }
    });
    console.error('Config Errors', errors);
    throw new ConfigError(errors);
  }

  // Custom validation: only one sortable field can have default_sort property
  if (config.collections) {
    config.collections.forEach((collection, index) => {
      if (collection.sortable_fields) {
        const defaultFields = collection.sortable_fields.filter(
          field => typeof field === 'object' && field.default_sort !== undefined,
        );
        if (defaultFields.length > 1) {
          const error = {
            instancePath: `/collections/${index}/sortable_fields`,
            message: 'only one sortable field can have the default_sort property',
          };
          console.error('Config Errors', [error]);
          throw new ConfigError([error]);
        }
      }
    });
  }
}

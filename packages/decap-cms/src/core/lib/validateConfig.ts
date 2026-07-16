import { extensionFormatters, frontmatterFormats } from '@/core/formats/formats';
import { I18N_FIELD, I18N_STRUCTURE } from './i18n';
import { validateJSONSchema } from './jsonSchemaValidator';
import { getWidgets } from './registry';

import type { JSONSchema, SchemaError } from './jsonSchemaValidator';

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
 * Config for fields in both file and folder collections. The schema is
 * recursive (`field`/`fields`/`types` nest more fields), expressed with
 * circular object references instead of `$id`/`$ref`.
 */
function fieldsConfig(): JSONSchema {
  const fieldProperties: Record<string, JSONSchema> = {
    name: { type: 'string' },
    label: { type: 'string' },
    widget: { type: 'string' },
    required: { type: 'boolean' },
    i18n: i18nField,
    hint: { type: 'string' },
    pattern: {
      type: 'array',
      minItems: 2,
      items: [{ oneOf: [{ type: 'string' }, { instanceof: 'RegExp' }] }, { type: 'string' }],
    },
  };
  const field: JSONSchema = {
    // ------- Each field: -------
    type: 'object',
    properties: fieldProperties,
    required: ['name'],
    widgets: getWidgetSchemas(),
  };
  const fields: JSONSchema = {
    type: 'array',
    minItems: 1,
    items: field,
    uniqueItemProperties: ['name'],
  };
  fieldProperties.field = field;
  fieldProperties.fields = fields;
  fieldProperties.types = fields;
  return fields;
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
function getConfigSchema(): JSONSchema {
  return {
    type: 'object',
    properties: {
      backend: {
        type: 'object',
        properties: {
          name: { type: 'string', examples: ['test-repo'] },
          auth_scope: {
            type: 'string',
            examples: ['repo', 'public_repo'],
            enum: ['repo', 'public_repo'],
          },
          cms_label_prefix: { type: 'string', minLength: 1 },
          open_authoring: { type: 'boolean', examples: [true] },
        },
        required: ['name'],
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
      media_folder_relative: { type: 'boolean' },
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
                  preview_path_preserve_slashes: { type: 'boolean' },
                  fields: fieldsConfig(),
                },
                required: ['name', 'label', 'file', 'fields'],
              },
              uniqueItemProperties: ['name'],
            },
            identifier_field: { type: 'string' },
            summary: { type: 'string' },
            slug: { type: 'string' },
            path: { type: 'string' },
            preview_path: { type: 'string' },
            preview_path_date_field: { type: 'string' },
            preview_path_preserve_slashes: { type: 'boolean' },
            create: { type: 'boolean' },
            publish: { type: 'boolean' },
            hide: { type: 'boolean' },
            editor: {
              type: 'object',
              properties: {
                preview: { type: 'boolean' },
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
                        oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['asc', 'desc'] }],
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
                type: 'string',
              },
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
                  required: ['label', 'widget', 'index_file'],
                },
              },
              additionalProperties: false,
              minProperties: 1,
            },
            i18n: i18nCollection,
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
      editor: {
        type: 'object',
        properties: {
          preview: { type: 'boolean' },
        },
      },
    },
    required: ['backend', 'collections'],
    anyOf: [{ required: ['media_folder'] }, { required: ['media_library'] }],
  };
}

function getWidgetSchemas(): Record<string, JSONSchema | undefined> {
  const schemas = getWidgets().map(widget => ({
    [widget.name]: (widget as Record<string, unknown>).schema,
  }));
  return Object.assign({}, ...schemas);
}

class ConfigError extends Error {
  errors: SchemaError[];

  constructor(errors: SchemaError[]) {
    const message = errors
      .map(({ message, instancePath }) => {
        const dotPath = instancePath
          .slice(1)
          .split('/')
          .map((seg: string) => (seg.match(/^\d+$/) ? `[${seg}]` : `.${seg}`))
          .join('')
          .slice(1);
        return `${dotPath ? `'${dotPath}'` : 'config'} ${message}`;
      })
      .join('\n');
    super(message);

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
export function validateConfig(config: Record<string, unknown>) {
  const rawErrors = validateJSONSchema(getConfigSchema(), config);
  if (rawErrors.length > 0) {
    const errors = rawErrors.map(e => {
      switch (e.keyword) {
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
    (config.collections as Record<string, unknown>[]).forEach(
      (collection: Record<string, unknown>, index: number) => {
        if (collection.sortable_fields) {
          const defaultFields = (collection.sortable_fields as unknown[]).filter(
            (field: unknown) =>
              typeof field === 'object'
              && field !== null
              && (field as Record<string, unknown>).default_sort !== undefined,
          );
          if (defaultFields.length > 1) {
            const error: SchemaError = {
              instancePath: `/collections/${index}/sortable_fields`,
              message: 'only one sortable field can have the default_sort property',
              keyword: '',
              params: {},
              schemaPath: '',
            };
            console.error('Config Errors', [error]);
            throw new ConfigError([error]);
          }
        }
      },
    );
  }
}

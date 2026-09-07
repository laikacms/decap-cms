import { getExtensionFormatters, getFrontmatterFormats } from '@/core/formats/formats';
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
    // DCMS-1422 (partial): validated against the collection's other entries
    // at save time, see validateUniqueFields.ts.
    unique: { type: 'boolean' },
    i18n: i18nField,
    hint: { type: 'string' },
    pattern: {
      type: 'array',
      minItems: 2,
      items: [{ oneOf: [{ type: 'string' }, { instanceof: 'RegExp' }] }, { type: 'string' }],
    },
    // Reusable-field-group reference shorthand, e.g. `{ group: 'seo' }` in
    // place of a regular field. Expanded away by `normalizeConfig` before
    // the rest of the app ever sees a field, so `group` never coexists with
    // widget-specific properties in practice - see the `oneOf` below.
    group: { type: 'string' },
    // Field-level steganographic-encoding opt-out, effective once the
    // collection has opted in via `editor.visualEditing`. See stega.tsx.
    visualEditing: { type: 'boolean' },
  };
  const field: JSONSchema = {
    // ------- Each field: -------
    type: 'object',
    properties: fieldProperties,
    // A field is either a regular, named field, or a `{ group: '<name>' }`
    // reference into the top-level `field_groups` map.
    oneOf: [{ required: ['name'] }, { required: ['group'] }],
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
 *
 * Exported (in addition to the default-exported `validateConfig`) so tests
 * can pin documentation against the live schema instead of a hand-copied
 * duplicate — see `__tests__/validateConfig.spec.ts`'s `collection.nested`
 * docs-pinning test.
 */
export function getConfigSchema(): JSONSchema {
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
          // laika backend only, see below.
          base_url: { type: 'string' },
          api_root: { type: 'string' },
          api_url: { type: 'string' },
          dev_token: { type: 'string' },
          // proxy backend only, see below.
          proxy_url: { type: 'string' },
        },
        required: ['name'],
        // The laika backend needs a `base_url` to reach its API; without it
        // `laika-backend.ts` fails much later with a cryptic network error
        // instead of a clear config-time one. See DCMS-1786.
        if: { properties: { name: { enum: ['laika'] } }, required: ['name'] },
        then: { required: ['base_url'], properties: { base_url: { minLength: 1 } } },
        // The proxy backend needs a `proxy_url` to reach its API; without it
        // `proxy/implementation.tsx` fails much later, at `ProxyBackend`
        // construction, with a cryptic runtime error instead of a clear
        // config-time one. Same failure mode as `base_url` above (DCMS-1786),
        // ported for the proxy backend. See DCMS-1848. The interpreter only
        // supports one `if`/`then`/`else` per schema, so the proxy check is
        // nested in `else` alongside the laika check above.
        else: {
          if: { properties: { name: { enum: ['proxy'] } }, required: ['name'] },
          then: {
            required: ['proxy_url'],
            properties: { proxy_url: { minLength: 1, pattern: '^(https?://.+|/(?!/).*)$' } },
          },
        },
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
      asset_collections: {
        type: 'array',
        minItems: 1,
        items: {
          // ------- Each asset collection: -------
          type: 'object',
          properties: {
            name: { type: 'string' },
            label: { type: 'string' },
            label_singular: { type: 'string' },
            description: { type: 'string' },
            media_folder: { type: 'string', examples: ['assets/images'] },
            public_folder: { type: 'string' },
            allowed_file_types: {
              type: 'array',
              items: { type: 'string' },
              uniqueItems: true,
            },
            filename_template: { type: 'string', examples: ['{{slug}}-{{index}}'] },
          },
          required: ['name', 'label', 'media_folder'],
        },
        uniqueItemProperties: ['name'],
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
      // Named, reusable field lists referenced from collections/files/nested
      // fields via `{ group: '<name>' }`. Keys are group names, values are
      // regular field arrays. This interpreter can't express "validate every
      // property value against a schema" for an object with unknown key
      // names (no ajv-style `additionalProperties: <schema>` support - see
      // `jsonSchemaValidator.ts`'s doc comment), so only the container shape
      // is checked here; unknown-group and per-field errors surface from
      // `expandFieldGroups` in `core/actions/config.tsx` instead.
      field_groups: { type: 'object' },
      // Role name -> scope list, granted to users whose backend payload
      // carries the matching `role`. Same validator limitation as
      // `field_groups` (no per-property schema for unknown key names), so
      // only the container shape is checked here; per-role validation
      // happens in `normalizeConfig`.
      roles: { type: 'object' },
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
            view_scopes: {
              type: 'array',
              items: { type: 'string' },
              uniqueItems: true,
            },
            edit_scopes: {
              type: 'array',
              items: { type: 'string' },
              uniqueItems: true,
            },
            // Single letter/digit for the collection's 'g <key>' keyboard chord.
            shortcut: { type: 'string', pattern: '^[a-zA-Z0-9]$' },
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
              minItems: 1,
              items: { type: 'string', minLength: 1 },
              uniqueItems: true,
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
                  required: ['label', 'widget'],
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
                extension: { enum: Object.keys(getExtensionFormatters()) },
              },
            },
            else: { required: ['format'] },
          },
          dependencies: {
            frontmatter_delimiter: {
              properties: {
                format: { enum: getFrontmatterFormats() },
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Walks a field array plus its nested `fields`/`field`/`types` (mirrors the
 * shapes `traverseFieldsJS` in `core/actions/config.tsx` recurses into),
 * calling `visit` on every field object found. Runs before
 * `expandFieldGroups`, so `{ group: '<name>' }` references aren't expanded
 * here - `field_groups` definitions are walked separately by the caller.
 */
function forEachField(fields: unknown, visit: (field: Record<string, unknown>) => void): void {
  if (!Array.isArray(fields)) return;
  for (const field of fields) {
    if (!isPlainRecord(field)) continue;
    visit(field);
    if (Array.isArray(field.fields)) forEachField(field.fields, visit);
    if (isPlainRecord(field.field)) forEachField([field.field], visit);
    if (Array.isArray(field.types)) forEachField(field.types, visit);
  }
}

/** Every field array reachable from the raw (pre-normalize) config. */
function collectFieldArrays(config: Record<string, unknown>): unknown[][] {
  const arrays: unknown[][] = [];

  if (Array.isArray(config.collections)) {
    for (const collection of config.collections) {
      if (!isPlainRecord(collection)) continue;
      if (Array.isArray(collection.fields)) arrays.push(collection.fields);
      if (Array.isArray(collection.files)) {
        for (const file of collection.files) {
          if (isPlainRecord(file) && Array.isArray(file.fields)) arrays.push(file.fields);
        }
      }
    }
  }

  if (isPlainRecord(config.field_groups)) {
    for (const groupFields of Object.values(config.field_groups)) {
      if (Array.isArray(groupFields)) arrays.push(groupFields);
    }
  }

  return arrays;
}

const REMOVED_RICHTEXT_KEYS = ['editor_components', 'editorComponents'] as const;

// `markdown` is a back-compat alias registered onto the same richtext control
// (see `app/extensions.ts`: `{ ...RichtextWidget(), name: 'markdown' }`), so it
// must be guarded identically to `richtext` - otherwise `editor_components` on
// a `markdown` field passes validation silently and is then dropped at render
// time with no error.
const RICHTEXT_FAMILY_WIDGETS = ['richtext', 'markdown'] as const;

// `minimal`/`buttons`/`modes`/`sanitize_preview` pass schema validation
// (`widgets/richtext/widget/schema.ts`) and have no reader anywhere in the
// widget - see that file and the richtext README's "Accepted-but-inert
// legacy keys" section. Unlike `editor_components` they don't lose content,
// so a one-time console warning is enough; a hard error would be overkill.
const INERT_RICHTEXT_KEYS = ['minimal', 'buttons', 'modes', 'sanitize_preview'] as const;
const warnedInertRichtextKeys = new Set<string>();

function warnInertRichtextKey(key: (typeof INERT_RICHTEXT_KEYS)[number]) {
  if (warnedInertRichtextKeys.has(key)) return;
  warnedInertRichtextKeys.add(key);
  if (key === 'sanitize_preview') {
    console.warn(
      "Richtext field config key 'sanitize_preview' has no effect: there is no sanitizer call "
        + 'anywhere in the widget, so setting it (including to `false`) does not control anything. '
        + "See widgets/richtext/README.md, 'Accepted-but-inert legacy keys'.",
    );
    return;
  }
  console.warn(
    `Richtext field config key '${key}' has no effect in the current (Lexical) widget - it's `
      + "accepted only for backward compatibility with the old decap-cms-widget-markdown config "
      + "surface. See widgets/richtext/README.md, 'Accepted-but-inert legacy keys'.",
  );
}

/**
 * `editor_components`/`editorComponents` configured custom Markdown block
 * components in the pre-Lexical markdown widget. That API was removed along
 * with the widget, nothing reads either key anymore, and neither the base
 * field schema nor the richtext widget schema declares
 * `additionalProperties: false` (deliberately - see DCMS-1974's "out of
 * scope"), so schema validation alone accepts the key silently. This walks
 * the raw (pre-normalize) config directly so a user who sets either key on a
 * `richtext` field (or its `markdown` back-compat alias, which renders
 * through the same control) gets a clear error instead of quietly losing
 * their custom blocks. Also fires the inert-key warnings above while it's
 * already walking every richtext-family field.
 */
function checkRichtextFieldKeys(config: Record<string, unknown>): SchemaError[] {
  const errors: SchemaError[] = [];

  for (const fieldArray of collectFieldArrays(config)) {
    forEachField(fieldArray, field => {
      if (!RICHTEXT_FAMILY_WIDGETS.includes(field.widget as typeof RICHTEXT_FAMILY_WIDGETS[number])) return;

      const removedKey = REMOVED_RICHTEXT_KEYS.find(key => key in field);
      if (removedKey) {
        const fieldName = typeof field.name === 'string' ? field.name : '<unnamed>';
        errors.push({
          instancePath: '',
          schemaPath: '',
          keyword: '',
          params: { field: fieldName, key: removedKey },
          message:
            `${String(field.widget)} field '${fieldName}' sets '${removedKey}', which was removed in `
            + 'v4. Register custom blocks with CMS.registerBlock(...) before init(). See '
            + "widgets/richtext/README.md, 'Custom blocks'.",
        });
      }

      for (const inertKey of INERT_RICHTEXT_KEYS) {
        if (inertKey in field) warnInertRichtextKey(inertKey);
      }
    });
  }

  return errors;
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

  // Custom validation: reject removed richtext config keys, warn on inert ones.
  const richtextFieldKeyErrors = checkRichtextFieldKeys(config);
  if (richtextFieldKeyErrors.length > 0) {
    console.error('Config Errors', richtextFieldKeyErrors);
    throw new ConfigError(richtextFieldKeyErrors);
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

  // Custom validation: the local-fs backend has no git/PR layer to stage
  // unpublished drafts against, so every unpublishedEntry*/
  // publishUnpublishedEntry/updateUnpublishedEntryStatus method rejects at
  // runtime (see local-fs/implementation.tsx and its README's "Editorial
  // workflow" section). Catching the combo here, at config-load time, saves
  // the user from picking a directory and granting permission before hitting
  // that wall later. See DCMS-1860.
  if (
    config.backend
    && typeof config.backend === 'object'
    && (config.backend as Record<string, unknown>).name === 'local-fs'
    && config.publish_mode === 'editorial_workflow'
  ) {
    const error: SchemaError = {
      instancePath: '',
      message:
        "backend 'local-fs' does not support publish_mode 'editorial_workflow' - use publish_mode: simple (or omit it) or choose a git-based backend",
      keyword: '',
      params: {},
      schemaPath: '',
    };
    console.error('Config Errors', [error]);
    throw new ConfigError([error]);
  }
}

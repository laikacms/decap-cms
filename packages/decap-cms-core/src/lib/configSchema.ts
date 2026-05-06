import { z } from 'zod';

import { frontmatterFormats, extensionFormatters } from '../formats/formats';
import { getWidgets } from './registry';
import { I18N_STRUCTURE, I18N_FIELD } from './i18n';

import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { $ZodIssue } from 'zod/v4/core';

type PathSegment = PropertyKey;

type FormattedIssue = { path: PathSegment[]; message: string };

const I18N_STRUCTURE_VALUES = Object.values(I18N_STRUCTURE) as [string, ...string[]];
const I18N_FIELD_VALUES = Object.values(I18N_FIELD) as [string, ...string[]];

const localeType = z.string().min(2).max(10).regex(/^[a-zA-Z-_]+$/, {
  message: 'must match pattern "^[a-zA-Z-_]+$"',
});

const i18nObjectShape = {
  structure: z.enum(I18N_STRUCTURE_VALUES).optional(),
  locales: z.array(localeType).min(1).optional(),
  default_locale: localeType.optional(),
};

const i18nObject = z.object(i18nObjectShape).passthrough();

const i18nRoot = z
  .object({
    ...i18nObjectShape,
    structure: z.enum(I18N_STRUCTURE_VALUES),
    locales: z.array(localeType).min(1),
  })
  .passthrough();

const i18nCollection = z.union([z.boolean(), i18nObject]);
const i18nField = z.union([z.boolean(), z.enum(I18N_FIELD_VALUES)]);

const regexInstance = z.custom<RegExp>(value => value instanceof RegExp, {
  message: 'must be a regular expression',
});

const fieldPattern = z.tuple([z.union([z.string(), regexInstance]), z.string()]);

type FieldShape = {
  name: string;
  widget?: unknown;
  fields?: FieldShape[];
  field?: FieldShape;
  types?: FieldShape[];
  [key: string]: unknown;
};

const baseField: z.ZodType<FieldShape> = z.lazy(() =>
  z
    .object({
      name: z.string(),
      label: z.string().optional(),
      widget: z.string().optional(),
      required: z.boolean().optional(),
      i18n: i18nField.optional(),
      hint: z.string().optional(),
      pattern: fieldPattern.optional(),
      field: baseField.optional(),
      fields: z.array(baseField).min(1).superRefine(refineFieldsArray).optional(),
      types: z.array(baseField).min(1).superRefine(refineFieldsArray).optional(),
    })
    .passthrough(),
);

function getWidgetSchemas(): Record<string, StandardSchemaV1> {
  const result: Record<string, StandardSchemaV1> = {};
  for (const widget of getWidgets()) {
    if (widget.name && widget.schema) {
      result[widget.name] = widget.schema;
    }
  }
  return result;
}

function isZodSchema(schema: StandardSchemaV1): schema is StandardSchemaV1 & {
  safeParse: (input: unknown) => { success: boolean; error?: { issues: $ZodIssue[] } };
} {
  return typeof (schema as { safeParse?: unknown }).safeParse === 'function';
}

function applyWidgetSchema(
  field: FieldShape,
  ctx: z.RefinementCtx,
  basePath: PathSegment[],
): void {
  if (typeof field.widget !== 'string') return;
  const widgetSchemas = getWidgetSchemas();
  const schema = widgetSchemas[field.widget];
  if (!schema) return;

  // Prefer Zod's native parse path when available so we can run issues
  // through our AJV-style formatter and get consistent error messages.
  if (isZodSchema(schema)) {
    const widgetResult = schema.safeParse(field);
    if (widgetResult.success || !widgetResult.error) return;
    for (const sub of widgetResult.error.issues) {
      const formatted = formatIssue(sub, field);
      for (const f of formatted) {
        ctx.addIssue({
          code: 'custom',
          message: f.message,
          path: [...basePath, ...f.path],
        });
      }
    }
    return;
  }

  // Fallback for non-Zod Standard Schemas: pass the message through as-is.
  const result = schema['~standard'].validate(field);
  if (result instanceof Promise) {
    throw new Error(
      `Widget "${field.widget}" provided an async schema, which is not supported.`,
    );
  }
  if (!result.issues) return;
  for (const subIssue of result.issues) {
    const subPath: PathSegment[] = [];
    for (const seg of subIssue.path ?? []) {
      subPath.push(typeof seg === 'object' && seg !== null ? (seg.key as PathSegment) : seg);
    }
    ctx.addIssue({
      code: 'custom',
      message: subIssue.message,
      path: [...basePath, ...subPath],
    });
  }
}

function refineFieldsArray(fields: FieldShape[], ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  for (const field of fields) {
    if (typeof field.name === 'string' && seen.has(field.name)) {
      ctx.addIssue({
        code: 'custom',
        message: 'fields names must be unique',
        path: [],
      });
      break;
    }
    if (typeof field.name === 'string') seen.add(field.name);
  }

  fields.forEach((field, idx) => {
    applyWidgetSchema(field, ctx, [idx]);
  });
}

const fieldsArray = z.array(baseField).min(1).superRefine(refineFieldsArray);

const viewFilters = z
  .array(
    z
      .object({
        label: z.string(),
        field: z.string(),
        pattern: z.union([z.boolean(), z.string()]),
      })
      .strict(),
  )
  .min(1);

const viewGroups = z
  .array(
    z
      .object({
        label: z.string(),
        field: z.string(),
        pattern: z.string().optional(),
      })
      .strict(),
  )
  .min(1);

const sortableField = z.union([
  z.string(),
  z
    .object({
      field: z.string(),
      label: z.string().optional(),
      default_sort: z.union([z.boolean(), z.enum(['asc', 'desc'])]).optional(),
    })
    .strict(),
]);

const collectionFile = z
  .object({
    name: z.string(),
    label: z.string(),
    label_singular: z.string().optional(),
    description: z.string().optional(),
    file: z.string(),
    preview_path: z.string().optional(),
    preview_path_date_field: z.string().optional(),
    preview_path_preserve_slashes: z.boolean().optional(),
    fields: fieldsArray,
  })
  .passthrough();

const metaSchema = z
  .object({
    path: z
      .object({
        label: z.string(),
        widget: z.string(),
        index_file: z.string(),
      })
      .passthrough()
      .optional(),
  })
  .strict();

const collection = z
  .object({
    name: z.string(),
    label: z.string(),
    label_singular: z.string().optional(),
    description: z.string().optional(),
    folder: z.string().optional(),
    files: z.array(collectionFile).optional(),
    identifier_field: z.string().optional(),
    summary: z.string().optional(),
    slug: z.string().optional(),
    path: z.string().optional(),
    preview_path: z.string().optional(),
    preview_path_date_field: z.string().optional(),
    preview_path_preserve_slashes: z.boolean().optional(),
    create: z.boolean().optional(),
    publish: z.boolean().optional(),
    hide: z.boolean().optional(),
    editor: z
      .object({
        preview: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    format: z.string().optional(),
    extension: z.string().optional(),
    frontmatter_delimiter: z
      .union([z.string(), z.array(z.string()).min(2).max(2)])
      .optional(),
    fields: fieldsArray.optional(),
    sortable_fields: z.array(sortableField).optional(),
    sortableFields: z.array(z.string()).optional(),
    view_filters: viewFilters.optional(),
    view_groups: viewGroups.optional(),
    nested: z
      .object({
        depth: z.number().min(1).max(1000),
        subfolders: z.boolean().optional(),
        summary: z.string().optional(),
      })
      .passthrough()
      .optional(),
    meta: metaSchema.refine(value => Object.keys(value).length >= 1, {
      message: 'must NOT have fewer than 1 properties',
    }).optional(),
    i18n: i18nCollection.optional(),
  })
  .passthrough();

const collections = z.array(collection).min(1);

const configSchema = z
  .object({
    backend: z
      .object({
        name: z.string(),
        auth_scope: z.enum(['repo', 'public_repo']).optional(),
        cms_label_prefix: z.string().min(1).optional(),
        open_authoring: z.boolean().optional(),
      })
      .passthrough(),
    local_backend: z
      .union([
        z.boolean(),
        z
          .object({
            url: z.string().optional(),
            allowed_hosts: z.array(z.string()).optional(),
          })
          .strict(),
      ])
      .optional(),
    locale: z.string().optional(),
    i18n: i18nRoot.optional(),
    site_url: z.string().optional(),
    display_url: z.string().optional(),
    logo_url: z.string().optional(),
    logo: z
      .object({
        src: z.string(),
        show_in_header: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    show_preview_links: z.boolean().optional(),
    media_folder: z.string().optional(),
    public_folder: z.string().optional(),
    media_folder_relative: z.boolean().optional(),
    media_library: z
      .object({
        name: z.string(),
        config: z.object({}).passthrough().optional(),
      })
      .passthrough()
      .optional(),
    publish_mode: z.enum(['simple', 'editorial_workflow', '']).optional(),
    slug: z
      .object({
        encoding: z.enum(['unicode', 'ascii']).optional(),
        clean_accents: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    issue_reports: z
      .object({
        url: z.string().optional(),
      })
      .passthrough()
      .optional(),
    collections,
    editor: z
      .object({
        preview: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

function formatPath(path: ReadonlyArray<PropertyKey>): string {
  return path
    .map(seg => (typeof seg === 'number' || /^\d+$/.test(String(seg)) ? `[${String(seg)}]` : `.${String(seg)}`))
    .join('')
    .replace(/^\./, '');
}

function header(path: ReadonlyArray<PropertyKey>): string {
  const formatted = formatPath(path);
  return formatted === '' ? 'config' : `'${formatted}'`;
}

function expectedTypeName(expected: string): string {
  switch (expected) {
    case 'tuple':
      return 'array';
    case 'bigint':
      return 'integer';
    default:
      return expected;
  }
}

function getAtPath(input: unknown, path: ReadonlyArray<PropertyKey>): unknown {
  let cur: unknown = input;
  for (const seg of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string, unknown>)[String(seg)];
  }
  return cur;
}

function flattenIssues(issues: readonly $ZodIssue[], input: unknown): FormattedIssue[] {
  const out: FormattedIssue[] = [];
  for (const issue of issues) {
    out.push(...formatIssue(issue, input));
  }
  return out;
}

function formatIssue(issue: $ZodIssue, input: unknown): FormattedIssue[] {
  switch (issue.code) {
    case 'invalid_type': {
      const valueAtPath = getAtPath(input, issue.path as PropertyKey[]);
      if (valueAtPath === undefined && issue.path.length > 0) {
        const last = issue.path[issue.path.length - 1];
        return [
          {
            path: issue.path.slice(0, -1) as PathSegment[],
            message: `must have required property '${String(last)}'`,
          },
        ];
      }
      return [
        {
          path: issue.path as PathSegment[],
          message: `must be ${expectedTypeName(String((issue as { expected?: string }).expected))}`,
        },
      ];
    }
    case 'too_small': {
      const i = issue as { origin?: string; minimum?: number | bigint };
      const min = i.minimum ?? 0;
      if (i.origin === 'array') {
        return [{ path: issue.path as PathSegment[], message: `must NOT have fewer than ${min} items` }];
      }
      if (i.origin === 'string') {
        return [
          {
            path: issue.path as PathSegment[],
            message: `must NOT have fewer than ${min} characters`,
          },
        ];
      }
      if (i.origin === 'object') {
        return [
          {
            path: issue.path as PathSegment[],
            message: `must NOT have fewer than ${min} properties`,
          },
        ];
      }
      return [
        {
          path: issue.path as PathSegment[],
          message: `must be >= ${min}`,
        },
      ];
    }
    case 'too_big': {
      const i = issue as { origin?: string; maximum?: number | bigint };
      const max = i.maximum ?? 0;
      if (i.origin === 'array') {
        return [{ path: issue.path as PathSegment[], message: `must NOT have more than ${max} items` }];
      }
      if (i.origin === 'string') {
        return [
          {
            path: issue.path as PathSegment[],
            message: `must NOT have more than ${max} characters`,
          },
        ];
      }
      return [
        {
          path: issue.path as PathSegment[],
          message: `must be <= ${max}`,
        },
      ];
    }
    case 'invalid_format': {
      // Custom message attached on the schema is preserved in `issue.message`.
      return [
        {
          path: issue.path as PathSegment[],
          message: issue.message,
        },
      ];
    }
    case 'invalid_value': {
      return [
        {
          path: issue.path as PathSegment[],
          message: 'must be equal to one of the allowed values',
        },
      ];
    }
    case 'invalid_union': {
      const inner = (issue as { errors?: $ZodIssue[][] }).errors ?? [];
      const collected: FormattedIssue[] = [];
      const basePath = issue.path as PathSegment[];
      for (const branchIssues of inner) {
        for (const sub of branchIssues) {
          // Inner issue paths are relative to the union point; prepend the
          // union's absolute path so the message anchors at the right place.
          const rebased: $ZodIssue = {
            ...sub,
            path: [...basePath, ...(sub.path as PathSegment[])],
          } as $ZodIssue;
          collected.push(...formatIssue(rebased, input));
        }
      }
      if (collected.length === 0) {
        return [
          {
            path: basePath,
            message: issue.message,
          },
        ];
      }
      return collected;
    }
    default:
      return [
        {
          path: issue.path as PathSegment[],
          message: issue.message,
        },
      ];
  }
}

export class ConfigError extends Error {
  issues: FormattedIssue[];

  constructor(issues: FormattedIssue[]) {
    const message = issues.map(({ path, message }) => `${header(path)} ${message}`).join('\n');
    super(message);
    this.name = 'ConfigError';
    this.issues = issues;
    this.message = message;
  }

  toString(): string {
    return this.message;
  }
}

/**
 * Cross-cutting semantic checks that don't fit cleanly inside a Zod schema —
 * either because they need to run regardless of structural parse failures
 * (Zod's `superRefine` is skipped when upstream parsing fails), or because the
 * dependency between sibling fields is awkward to express with Zod combinators.
 */
function runSemanticChecks(config: Record<string, unknown>): FormattedIssue[] {
  const issues: FormattedIssue[] = [];

  if (
    !Object.prototype.hasOwnProperty.call(config, 'media_folder') &&
    !Object.prototype.hasOwnProperty.call(config, 'media_library')
  ) {
    issues.push({ path: [], message: "must have required property 'media_folder'" });
  }

  const collections = config.collections;
  if (!Array.isArray(collections)) return issues;

  const seenCollectionNames = new Set<string>();
  collections.forEach((rawCollection, idx) => {
    if (typeof rawCollection !== 'object' || rawCollection === null) return;
    const c = rawCollection as Record<string, unknown>;

    if (typeof c.name === 'string') {
      if (seenCollectionNames.has(c.name)) {
        issues.push({ path: ['collections'], message: 'collections names must be unique' });
      }
      seenCollectionNames.add(c.name);
    }

    if (Array.isArray(c.files)) {
      const seenFileNames = new Set<string>();
      for (const file of c.files) {
        if (typeof file !== 'object' || file === null) continue;
        const f = file as Record<string, unknown>;
        if (typeof f.name === 'string') {
          if (seenFileNames.has(f.name)) {
            issues.push({
              path: ['collections', idx, 'files'],
              message: 'files names must be unique',
            });
            break;
          }
          seenFileNames.add(f.name);
        }
      }
    }

    if ('sortable_fields' in c && 'sortableFields' in c) {
      issues.push({ path: ['collections', idx], message: 'must NOT be valid' });
    }

    if (Array.isArray(c.sortable_fields)) {
      const defaults = c.sortable_fields.filter(
        f =>
          typeof f === 'object' && f !== null && 'default_sort' in f && f.default_sort !== undefined,
      );
      if (defaults.length > 1) {
        issues.push({
          path: ['collections', idx, 'sortable_fields'],
          message: 'only one sortable field can have the default_sort property',
        });
      }
    }

    const hasFiles = 'files' in c;
    const hasFolder = 'folder' in c;
    const hasFields = 'fields' in c;
    if (!hasFiles && !(hasFolder && hasFields)) {
      issues.push({
        path: ['collections', idx],
        message: hasFolder
          ? "must have required property 'fields'"
          : "must have required property 'files'",
      });
    }

    if (typeof c.extension === 'string') {
      const inferred = (extensionFormatters as Record<string, unknown>)[c.extension];
      if (!inferred && c.format === undefined) {
        issues.push({
          path: ['collections', idx],
          message: "must have required property 'format'",
        });
      }
    }

    if ('frontmatter_delimiter' in c) {
      if (
        c.format === undefined ||
        !(frontmatterFormats as readonly string[]).includes(c.format as string)
      ) {
        issues.push({
          path: ['collections', idx],
          message: "must have required property 'format'",
        });
      }
    }
  });

  return issues;
}

/**
 * `validateConfig` is a pure function. It does not mutate
 * the config that is passed in.
 */
export function validateConfig(config: Record<string, unknown>): void {
  const result = configSchema.safeParse(config);
  const structural = result.success ? [] : flattenIssues(result.error.issues as $ZodIssue[], config);
  const semantic = runSemanticChecks(config);
  const formatted = [...structural, ...semantic];
  if (formatted.length === 0) return;
  console.error('Config Errors', formatted);
  throw new ConfigError(formatted);
}

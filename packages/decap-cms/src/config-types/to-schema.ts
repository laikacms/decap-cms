/**
 * Runtime converters that build validation schemas from the same field shape
 * the compile-time utilities in `./types.ts` operate on. Each converter walks
 * a Decap field array (a collection's `fields`, or a nested `list`/`object`
 * field's `fields`) and produces a schema for one of three libraries:
 *
 *   - `toZodSchema`      - Zod (v4), Standard Schema compatible natively.
 *   - `toZodMiniSchema`  - `zod/mini`, Standard Schema compatible natively
 *                          (same `~standard` implementation as regular Zod;
 *                          `zod/mini` is a tree-shakeable entry point over the
 *                          same v4 core, not a different validation engine).
 *   - `toEffectSchema`   - `effect/Schema`, wrapped with
 *                          `Schema.toStandardSchemaV1` so the result is both
 *                          a normal Effect schema and Standard Schema
 *                          compatible.
 *
 * `zod` is a genuinely optional peer dependency (see package.json): only
 * import `toZodSchema`/`toZodMiniSchema` from an app that actually installed
 * it. `effect` is already a mandatory dependency of this package (used by the
 * Laika backend), so `toEffectSchema` carries no extra install cost.
 *
 * These are plain static ESM imports, same as the existing optional peers
 * (e.g. `lucide-react` in `src/widgets/lucide-icon/*`) - opting out of the
 * unused converter/library relies on the consumer's bundler tree-shaking the
 * unused export (this package ships ESM with no relevant side effects), not
 * on a lazy `require`/dynamic `import()`. That keeps the converters
 * synchronous. Noted as a scope tradeoff in DCMS-1407.
 *
 * Widget-to-type semantics mirror `WidgetTypeMap`/`ExtractFieldType`/
 * `ExtractFieldsType` in `./types.ts`:
 *   - `required: true` is the default (only `required: false` opts out).
 *   - `widget: 'object'` with a `fields` array recurses into a nested shape;
 *     without `fields` it falls back to an open `Record<string, unknown>`.
 *   - `widget: 'list'` with a `fields` array produces an array of the nested
 *     shape; with a single `field` template it produces an array of that
 *     field's (scalar) widget type; otherwise it falls back to `unknown[]`.
 *   - `widget: 'select'` with `options` produces a literal union from the
 *     option values (or `{ value }` entries).
 *   - Any other/unknown widget passes through as `unknown` - this pass does
 *     not implement an extensible widget-schema registry (tracked as
 *     follow-up scope in DCMS-1407).
 */
import { Schema } from 'effect';
import { z } from 'zod';
import * as zm from 'zod/mini';

/** The minimal field shape the converters below need to read. */
export interface SchemaFieldLike {
  readonly name?: string;
  readonly widget?: string;
  readonly required?: boolean;
  readonly multiple?: boolean;
  readonly fields?: readonly SchemaFieldLike[];
  readonly field?: SchemaFieldLike;
  readonly options?: readonly unknown[];
}

type ScalarKind = 'string' | 'number' | 'boolean' | 'unknown';

/** Runtime mirror of `WidgetTypeMap` in `./types.ts` (built-in scalar widgets only). */
const WIDGET_SCALAR_KIND: Record<string, ScalarKind> = {
  string: 'string',
  text: 'string',
  markdown: 'string',
  number: 'number',
  boolean: 'boolean',
  datetime: 'string',
  date: 'string',
  image: 'string',
  file: 'string',
  select: 'string',
  hidden: 'string',
  code: 'string',
  color: 'string',
  relation: 'string',
  icon: 'string',
  // `map` has a structured `{ type: 'Point', coordinates: [number, number] }`
  // shape in WidgetTypeMap; modelling that precisely is deferred, same as
  // other unknown/third-party widgets, so it passes through as `unknown`.
};

const MULTIPLE_ARRAY_WIDGETS = new Set(['select', 'image', 'file', 'relation']);

function widgetScalarKind(widget: string | undefined): ScalarKind {
  if (widget && Object.prototype.hasOwnProperty.call(WIDGET_SCALAR_KIND, widget)) {
    return WIDGET_SCALAR_KIND[widget];
  }
  return 'unknown';
}

/** Intermediate schema representation shared by all three backends. */
export type FieldSpec =
  | { readonly kind: 'string' | 'number' | 'boolean' | 'unknown' }
  | { readonly kind: 'record' }
  | { readonly kind: 'literalUnion', readonly values: readonly (string | number | boolean)[] }
  | { readonly kind: 'array', readonly item: FieldSpec }
  | { readonly kind: 'object', readonly fields: readonly NamedFieldSpec[] };

export interface NamedFieldSpec {
  readonly name: string;
  readonly required: boolean;
  readonly spec: FieldSpec;
}

function literalUnionFromOptions(options: readonly unknown[]): FieldSpec {
  const values = options.map(option =>
    option !== null && typeof option === 'object' && 'value' in option
      ? (option as { value: unknown }).value
      : option
  ) as (string | number | boolean)[];
  return { kind: 'literalUnion', values };
}

function isFieldRequired(field: SchemaFieldLike): boolean {
  return field.required !== false;
}

/** Mirrors `ExtractSingleFieldType` (the `multiple` wrapper is applied by the caller). */
function buildSingleFieldSpec(field: SchemaFieldLike): FieldSpec {
  if (field.widget === 'list') {
    if (Array.isArray(field.fields)) {
      return buildObjectListSpec(field.fields);
    }
    if (field.field) {
      return { kind: 'array', item: { kind: widgetScalarKind(field.field.widget) } };
    }
    return { kind: 'array', item: { kind: 'unknown' } };
  }
  if (field.widget === 'object') {
    if (Array.isArray(field.fields)) {
      return buildObjectSpec(field.fields);
    }
    return { kind: 'record' };
  }
  if (field.widget === 'select' && Array.isArray(field.options)) {
    return literalUnionFromOptions(field.options);
  }
  return { kind: widgetScalarKind(field.widget) };
}

function buildObjectListSpec(fields: readonly SchemaFieldLike[]): FieldSpec {
  return { kind: 'array', item: buildObjectSpec(fields) };
}

/** Mirrors `ExtractFieldType` (adds the `multiple: true` array wrapper for select/image/file/relation). */
export function buildFieldSpec(field: SchemaFieldLike): FieldSpec {
  const single = buildSingleFieldSpec(field);
  if (field.multiple === true && field.widget && MULTIPLE_ARRAY_WIDGETS.has(field.widget)) {
    return { kind: 'array', item: single };
  }
  return single;
}

/** Mirrors `ExtractFieldsType` - a Decap field array keyed by `name`, required by default. */
export function buildObjectSpec(fields: readonly SchemaFieldLike[]): FieldSpec {
  return {
    kind: 'object',
    fields: fields
      .filter((field): field is SchemaFieldLike & { name: string } => typeof field.name === 'string')
      .map(field => ({
        name: field.name,
        required: isFieldRequired(field),
        spec: buildFieldSpec(field),
      })),
  };
}

// ---------------------------------------------------------------------------
// Zod
// ---------------------------------------------------------------------------

/**
 * Build a Zod schema from a Decap field array. The result is Standard Schema
 * (https://standardschema.dev/) compatible out of the box - Zod v4 objects
 * implement `~standard` natively.
 */
export function toZodSchema(fields: readonly SchemaFieldLike[]): z.ZodTypeAny {
  return specToZod(buildObjectSpec(fields));
}

function specToZod(spec: FieldSpec): z.ZodTypeAny {
  switch (spec.kind) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'unknown':
      return z.unknown();
    case 'record':
      return z.record(z.string(), z.unknown());
    case 'literalUnion': {
      if (spec.values.length === 0) return z.string();
      if (spec.values.length === 1) return z.literal(spec.values[0]);
      const [first, second, ...rest] = spec.values;
      return z.union([z.literal(first), z.literal(second), ...rest.map(value => z.literal(value))]);
    }
    case 'array':
      return z.array(specToZod(spec.item));
    case 'object': {
      const shape: Record<string, z.ZodTypeAny> = {};
      for (const field of spec.fields) {
        const fieldSchema = specToZod(field.spec);
        shape[field.name] = field.required ? fieldSchema : fieldSchema.optional();
      }
      return z.object(shape);
    }
  }
}

// ---------------------------------------------------------------------------
// Zod Mini
// ---------------------------------------------------------------------------

/**
 * Build a `zod/mini` schema from a Decap field array - same semantics as
 * `toZodSchema`, targeting the tree-shakeable `zod/mini` entry point for
 * smaller bundles. Standard Schema compatible: `zod/mini` schemas share the
 * same v4 core `~standard` implementation as regular Zod schemas, so no
 * extra wrapping is needed.
 */
export function toZodMiniSchema(fields: readonly SchemaFieldLike[]): zm.ZodMiniType {
  return specToZodMini(buildObjectSpec(fields));
}

function specToZodMini(spec: FieldSpec): zm.ZodMiniType {
  switch (spec.kind) {
    case 'string':
      return zm.string();
    case 'number':
      return zm.number();
    case 'boolean':
      return zm.boolean();
    case 'unknown':
      return zm.unknown();
    case 'record':
      return zm.record(zm.string(), zm.unknown());
    case 'literalUnion': {
      if (spec.values.length === 0) return zm.string();
      if (spec.values.length === 1) return zm.literal(spec.values[0]);
      const [first, second, ...rest] = spec.values;
      return zm.union([zm.literal(first), zm.literal(second), ...rest.map(value => zm.literal(value))]);
    }
    case 'array':
      return zm.array(specToZodMini(spec.item));
    case 'object': {
      const shape: Record<string, zm.ZodMiniType> = {};
      for (const field of spec.fields) {
        const fieldSchema = specToZodMini(field.spec);
        shape[field.name] = field.required ? fieldSchema : zm.optional(fieldSchema);
      }
      return zm.object(shape);
    }
  }
}

// ---------------------------------------------------------------------------
// Effect
// ---------------------------------------------------------------------------

/**
 * Build an `effect/Schema` from a Decap field array, wrapped with
 * `Schema.toStandardSchemaV1` so the result is both a regular Effect schema
 * (usable with `Schema.decodeUnknownSync`, combinators, etc.) and Standard
 * Schema compatible via its `~standard` property.
 */
export function toEffectSchema(
  fields: readonly SchemaFieldLike[],
): ReturnType<typeof Schema.toStandardSchemaV1> {
  return Schema.toStandardSchemaV1(specToEffect(buildObjectSpec(fields)));
}

function specToEffect(spec: FieldSpec): Schema.Decoder<unknown> {
  switch (spec.kind) {
    case 'string':
      return Schema.String;
    case 'number':
      return Schema.Number;
    case 'boolean':
      return Schema.Boolean;
    case 'unknown':
      return Schema.Unknown;
    case 'record':
      return Schema.Record(Schema.String, Schema.Unknown);
    case 'literalUnion': {
      if (spec.values.length === 0) return Schema.Unknown;
      return Schema.Literals(spec.values);
    }
    case 'array':
      return Schema.Array(specToEffect(spec.item));
    case 'object': {
      const shape: Record<string, Schema.Decoder<unknown>> = {};
      for (const field of spec.fields) {
        const fieldSchema = specToEffect(field.spec);
        shape[field.name] = field.required ? fieldSchema : Schema.optional(fieldSchema);
      }
      return Schema.Struct(shape);
    }
  }
}

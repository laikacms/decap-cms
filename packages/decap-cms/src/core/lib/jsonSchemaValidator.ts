import { isEqual } from 'lodash-es';

/**
 * Minimal JSON Schema (draft-07 subset) interpreter, replacing ajv for config
 * validation. It supports exactly the keywords used by the config schema in
 * `validateConfig.ts` and by widget `schema` definitions:
 *
 * - `type` (single or array), `enum`
 * - objects: `required`, `properties`, `additionalProperties: false`,
 *   `minProperties`, `dependencies` (schema form)
 * - arrays: `items` (schema or tuple), `minItems`, `maxItems`, `uniqueItems`
 * - strings: `minLength`, `maxLength`, `pattern`
 * - numbers: `minimum`, `maximum`
 * - combinators: `oneOf`, `anyOf`, `not`, `if`/`then`/`else`
 *
 * Plus three non-standard keywords:
 *
 * - `uniqueItemProperties` (from ajv-keywords): listed properties must be
 *   unique across the array's object items
 * - `instanceof` (from ajv-keywords): only `'RegExp'` is supported
 * - `widgets`: map of widget name to schema; an object value with a string
 *   `widget` property is additionally validated against the matching widget
 *   schema (replaces ajv-keywords' `select`/`selectCases` dispatch)
 *
 * Unknown keywords are ignored (ajv `strict: false` behavior). Schemas may
 * contain circular object references for recursion (instead of `$id`/`$ref`).
 * Error messages mirror ajv's wording so user-facing config errors and the
 * pinned specs keep working unchanged.
 */
export interface JSONSchema {
  type?: string | string[];
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JSONSchema>;
  additionalProperties?: boolean;
  minProperties?: number;
  dependencies?: Record<string, JSONSchema>;
  items?: JSONSchema | JSONSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  uniqueItemProperties?: string[];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  not?: JSONSchema;
  if?: JSONSchema;
  then?: JSONSchema;
  else?: JSONSchema;
  instanceof?: string;
  widgets?: Record<string, JSONSchema | undefined>;
  [keyword: string]: unknown;
}

/** Same shape as ajv's ErrorObject, which `ConfigError` consumers rely on. */
export interface SchemaError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: Record<string, unknown>;
  message: string;
}

export function validateJSONSchema(schema: JSONSchema, value: unknown): SchemaError[] {
  const errors: SchemaError[] = [];
  validate(schema, value, '', errors);
  return errors;
}

function error(
  instancePath: string,
  keyword: string,
  params: Record<string, unknown>,
  message: string,
): SchemaError {
  return { instancePath, schemaPath: '', keyword, params, message };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function matchesType(type: string, value: unknown): boolean {
  switch (type) {
    case 'object':
      return isPlainObject(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'null':
      return value === null;
    default:
      return false;
  }
}

function validate(schema: JSONSchema, value: unknown, path: string, errors: SchemaError[]): boolean {
  const start = errors.length;

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some(type => matchesType(type, value))) {
      const type = types.join(',');
      errors.push(error(path, 'type', { type }, `must be ${type}`));
      // Wrong type: the remaining keywords would only produce noise on top.
      return false;
    }
  }

  if (schema.enum !== undefined && !schema.enum.some(allowed => isEqual(allowed, value))) {
    errors.push(
      error(path, 'enum', { allowedValues: schema.enum }, 'must be equal to one of the allowed values'),
    );
  }

  if (schema.instanceof !== undefined && !(schema.instanceof === 'RegExp' && value instanceof RegExp)) {
    errors.push(error(path, 'instanceof', {}, 'must pass "instanceof" keyword validation'));
  }

  if (isPlainObject(value)) {
    validateObject(schema, value, path, errors);
  } else if (Array.isArray(value)) {
    validateArray(schema, value, path, errors);
  } else if (typeof value === 'string') {
    validateString(schema, value, path, errors);
  } else if (typeof value === 'number') {
    validateNumber(schema, value, path, errors);
  }

  if (schema.not !== undefined && validate(schema.not, value, path, [])) {
    errors.push(error(path, 'not', {}, 'must NOT be valid'));
  }

  if (schema.if !== undefined) {
    const branch = validate(schema.if, value, path, []) ? schema.then : schema.else;
    if (branch !== undefined) {
      validate(branch, value, path, errors);
    }
  }

  if (schema.oneOf !== undefined) {
    const failures: SchemaError[] = [];
    let passing = 0;
    for (const branch of schema.oneOf) {
      const branchErrors: SchemaError[] = [];
      if (validate(branch, value, path, branchErrors)) {
        passing += 1;
      } else {
        failures.push(...branchErrors);
      }
    }
    if (passing !== 1) {
      if (passing === 0) {
        errors.push(...failures);
      }
      errors.push(
        error(path, 'oneOf', { passingSchemas: passing }, 'must match exactly one schema in oneOf'),
      );
    }
  }

  if (schema.anyOf !== undefined) {
    const failures: SchemaError[] = [];
    let passed = false;
    for (const branch of schema.anyOf) {
      const branchErrors: SchemaError[] = [];
      if (validate(branch, value, path, branchErrors)) {
        passed = true;
        break;
      }
      failures.push(...branchErrors);
    }
    if (!passed) {
      errors.push(...failures);
      errors.push(error(path, 'anyOf', {}, 'must match a schema in anyOf'));
    }
  }

  if (schema.widgets !== undefined && isPlainObject(value) && typeof value.widget === 'string') {
    const widgetSchema = schema.widgets[value.widget];
    if (widgetSchema !== undefined) {
      validate(widgetSchema, value, path, errors);
    }
  }

  return errors.length === start;
}

function validateObject(
  schema: JSONSchema,
  obj: Record<string, unknown>,
  path: string,
  errors: SchemaError[],
) {
  for (const prop of schema.required ?? []) {
    if (obj[prop] === undefined) {
      errors.push(
        error(path, 'required', { missingProperty: prop }, `must have required property '${prop}'`),
      );
    }
  }

  if (schema.properties !== undefined) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (obj[key] !== undefined) {
        validate(propSchema, obj[key], `${path}/${key}`, errors);
      }
    }
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(obj)) {
      if (schema.properties === undefined || !(key in schema.properties)) {
        errors.push(
          error(path, 'additionalProperties', { additionalProperty: key }, 'must NOT have additional properties'),
        );
      }
    }
  }

  if (schema.minProperties !== undefined && Object.keys(obj).length < schema.minProperties) {
    errors.push(
      error(
        path,
        'minProperties',
        { limit: schema.minProperties },
        `must NOT have fewer than ${schema.minProperties} properties`,
      ),
    );
  }

  if (schema.dependencies !== undefined) {
    for (const [key, depSchema] of Object.entries(schema.dependencies)) {
      if (obj[key] !== undefined) {
        validate(depSchema, obj, path, errors);
      }
    }
  }
}

function validateArray(schema: JSONSchema, arr: unknown[], path: string, errors: SchemaError[]) {
  if (schema.minItems !== undefined && arr.length < schema.minItems) {
    errors.push(
      error(path, 'minItems', { limit: schema.minItems }, `must NOT have fewer than ${schema.minItems} items`),
    );
  }

  if (schema.maxItems !== undefined && arr.length > schema.maxItems) {
    errors.push(
      error(path, 'maxItems', { limit: schema.maxItems }, `must NOT have more than ${schema.maxItems} items`),
    );
  }

  if (schema.items !== undefined) {
    if (Array.isArray(schema.items)) {
      schema.items.forEach((itemSchema, index) => {
        if (index < arr.length) {
          validate(itemSchema, arr[index], `${path}/${index}`, errors);
        }
      });
    } else {
      const itemSchema = schema.items;
      arr.forEach((item, index) => {
        validate(itemSchema, item, `${path}/${index}`, errors);
      });
    }
  }

  if (schema.uniqueItems === true) {
    outer: for (let i = 0; i < arr.length; i += 1) {
      for (let j = i + 1; j < arr.length; j += 1) {
        if (isEqual(arr[i], arr[j])) {
          errors.push(
            error(
              path,
              'uniqueItems',
              { i: j, j: i },
              `must NOT have duplicate items (items ## ${i} and ${j} are identical)`,
            ),
          );
          break outer;
        }
      }
    }
  }

  if (schema.uniqueItemProperties !== undefined) {
    for (const prop of schema.uniqueItemProperties) {
      const seen = new Set<unknown>();
      for (const item of arr) {
        if (!isPlainObject(item)) continue;
        const itemValue = item[prop];
        if (itemValue === undefined || typeof itemValue === 'object') continue;
        if (seen.has(itemValue)) {
          errors.push(
            error(
              path,
              'uniqueItemProperties',
              { uniqueItemProperties: schema.uniqueItemProperties },
              'must pass "uniqueItemProperties" keyword validation',
            ),
          );
          break;
        }
        seen.add(itemValue);
      }
    }
  }
}

function validateString(schema: JSONSchema, value: string, path: string, errors: SchemaError[]) {
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push(
      error(
        path,
        'minLength',
        { limit: schema.minLength },
        `must NOT have fewer than ${schema.minLength} characters`,
      ),
    );
  }

  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    errors.push(
      error(
        path,
        'maxLength',
        { limit: schema.maxLength },
        `must NOT have more than ${schema.maxLength} characters`,
      ),
    );
  }

  if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
    errors.push(
      error(path, 'pattern', { pattern: schema.pattern }, `must match pattern "${schema.pattern}"`),
    );
  }
}

function validateNumber(schema: JSONSchema, value: number, path: string, errors: SchemaError[]) {
  if (schema.minimum !== undefined && value < schema.minimum) {
    errors.push(error(path, 'minimum', { limit: schema.minimum }, `must be >= ${schema.minimum}`));
  }

  if (schema.maximum !== undefined && value > schema.maximum) {
    errors.push(error(path, 'maximum', { limit: schema.maximum }, `must be <= ${schema.maximum}`));
  }
}

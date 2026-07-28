import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

/**
 * `schema/config.schema.json` (DCMS-1402) is a hand-maintained, IDE-facing
 * JSON Schema mirroring the structural shape of `getConfigSchema()` in
 * `validateConfig.ts`. It targets standard JSON Schema draft-07 consumers
 * (yaml-language-server, vscode-json-languageservice, etc.), which support
 * `$ref`/`definitions` — but this repo's own `jsonSchemaValidator.ts` is a
 * minimal interpreter that deliberately does *not* implement `$ref`
 * (it recurses via plain circular object references instead, see its file
 * doc comment). So before we can exercise the shipped schema against that
 * interpreter for the cross-check below, we dereference `$ref`/`definitions`
 * into an equivalent circular object graph.
 */
function dereference(schema: JSONSchema): JSONSchema {
  const definitions = (schema.definitions ?? {}) as Record<string, JSONSchema>;
  const resolved = new Map<string, JSONSchema>();

  function resolveDefinition(name: string): JSONSchema {
    const cached = resolved.get(name);
    if (cached) return cached;

    const raw = definitions[name];
    if (!raw) {
      throw new Error(`Unknown $ref target: #/definitions/${name}`);
    }

    // Insert the (still-empty) target object into the cache *before*
    // walking its children, so a self-reference (e.g. `field.field`)
    // resolves to this same object instead of recursing forever.
    const target: JSONSchema = {};
    resolved.set(name, target);
    Object.assign(target, walk(raw));
    return target;
  }

  function walk(node: unknown): unknown {
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (typeof obj.$ref === 'string') {
        const match = obj.$ref.match(/^#\/definitions\/(.+)$/);
        if (!match) {
          throw new Error(`Unsupported $ref: ${obj.$ref}`);
        }
        return resolveDefinition(match[1]);
      }
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'definitions') continue;
        out[key] = walk(value);
      }
      return out;
    }
    return node;
  }

  return walk({ ...schema, definitions: undefined }) as JSONSchema;
}

const schemaPath = path.resolve(
  fileURLToPath(import.meta.url),
  '../../../../../schema/config.schema.json',
);
const rawSchema = JSON.parse(readFileSync(schemaPath, 'utf8')) as JSONSchema;

describe('shipped config.schema.json (DCMS-1402)', () => {
  it('is valid, parseable JSON with the expected top-level shape', () => {
    expect(rawSchema.type).toBe('object');
    expect(rawSchema.required).toEqual(['backend', 'collections']);
    expect(rawSchema.properties?.collections).toBeDefined();
    expect(rawSchema.properties?.backend).toBeDefined();
  });

  it('has a top-level asset_collections property mirroring getConfigSchema() (DCMS-1626)', () => {
    const assetCollections = rawSchema.properties?.asset_collections as JSONSchema | undefined;
    expect(assetCollections).toBeDefined();
    expect(assetCollections?.type).toBe('array');
    expect(assetCollections?.minItems).toBe(1);

    const items = assetCollections?.items as JSONSchema;
    expect(items.type).toBe('object');
    expect(items.required).toEqual(['name', 'label', 'media_folder']);
    expect(items.properties?.name).toBeDefined();
    expect(items.properties?.label).toBeDefined();
    expect(items.properties?.label_singular).toBeDefined();
    expect(items.properties?.description).toBeDefined();
    expect(items.properties?.media_folder).toBeDefined();
    expect(items.properties?.public_folder).toBeDefined();
    expect(items.properties?.allowed_file_types).toBeDefined();
    expect(items.properties?.filename_template).toBeDefined();
  });

  it('every $ref points at a declared definition', () => {
    const definitions = rawSchema.definitions as Record<string, JSONSchema>;
    expect(Object.keys(definitions).length).toBeGreaterThan(0);

    function collectRefs(node: unknown, refs: Set<string>): void {
      if (Array.isArray(node)) {
        node.forEach(item => collectRefs(item, refs));
        return;
      }
      if (node && typeof node === 'object') {
        const obj = node as Record<string, unknown>;
        if (typeof obj.$ref === 'string') refs.add(obj.$ref);
        Object.values(obj).forEach(value => collectRefs(value, refs));
      }
    }

    const refs = new Set<string>();
    collectRefs(rawSchema, refs);
    expect(refs.size).toBeGreaterThan(0);

    for (const ref of refs) {
      const name = ref.replace('#/definitions/', '');
      expect(definitions[name], `${ref} must resolve to a definition`).toBeDefined();
    }
  });

  describe('agrees with the runtime validator (jsonSchemaValidator.ts)', () => {
    const schema = dereference(rawSchema);

    const validConfig = {
      backend: { name: 'test-repo' },
      media_folder: 'assets/uploads',
      collections: [
        {
          name: 'posts',
          label: 'Posts',
          folder: '_posts',
          fields: [
            { name: 'title', label: 'Title', widget: 'string' },
            {
              name: 'body',
              label: 'Body',
              widget: 'list',
              fields: [{ name: 'text', label: 'Text', widget: 'text' }],
            },
          ],
        },
      ],
    };

    it('accepts a minimal valid config with no errors', () => {
      expect(validateJSONSchema(schema, validConfig)).toEqual([]);
    });

    it('rejects a config missing required top-level keys', () => {
      const errors = validateJSONSchema(schema, { foo: 'bar' });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.keyword === 'required')).toBe(true);
    });

    it('rejects a collection missing both `files` and `folder`+`fields`', () => {
      const invalidConfig = {
        ...validConfig,
        collections: [{ name: 'posts', label: 'Posts' }],
      };
      const errors = validateJSONSchema(schema, invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects a field missing the required `name`', () => {
      const invalidConfig = {
        ...validConfig,
        collections: [
          {
            name: 'posts',
            label: 'Posts',
            folder: '_posts',
            fields: [{ label: 'Title', widget: 'string' }],
          },
        ],
      };
      const errors = validateJSONSchema(schema, invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('accepts a top-level field_groups map with a `{ group }` field reference', () => {
      const configWithFieldGroups = {
        ...validConfig,
        field_groups: {
          seo: [{ name: 'seo_title', label: 'SEO Title', widget: 'string' }],
        },
        collections: [
          {
            name: 'posts',
            label: 'Posts',
            folder: '_posts',
            fields: [{ name: 'title', label: 'Title', widget: 'string' }, { group: 'seo' }],
          },
        ],
      };
      expect(validateJSONSchema(schema, configWithFieldGroups)).toEqual([]);
    });

    it('accepts a top-level asset_collections array (DCMS-1626)', () => {
      const configWithAssetCollections = {
        ...validConfig,
        asset_collections: [
          { name: 'images', label: 'Images', media_folder: 'assets/images' },
        ],
      };
      expect(validateJSONSchema(schema, configWithAssetCollections)).toEqual([]);
    });

    it('rejects an asset_collections entry missing a required field (DCMS-1626)', () => {
      const invalidConfig = {
        ...validConfig,
        asset_collections: [{ name: 'images', label: 'Images' }],
      };
      const errors = validateJSONSchema(schema, invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.keyword === 'required')).toBe(true);
    });
  });
});

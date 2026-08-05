vi.mock('../registry');

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getEntryCodec, getEntryCodecs, getWidgets } from '@/core/lib/registry';
import { yamlEntryCodec } from '@/entry-codecs/yaml/index';

// `validateConfig` reads registered widgets/entry codecs off the registry;
// the registry is automocked (same setup as validateConfig.spec.ts) so this
// guard's tests exercise real schema validation without booting the full app.
const entryCodecs = [yamlEntryCodec];
vi.mocked(getEntryCodecs).mockImplementation(() => entryCodecs);
vi.mocked(getEntryCodec).mockImplementation(
  name => entryCodecs.find(pack => pack.name === name || pack.aliases?.includes(name)),
);
vi.mocked(getWidgets).mockImplementation(() => [{}] as never);

describe('validateConfigYaml', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const validYaml = `
backend:
  name: git-gateway
media_folder: static/images
collections:
  - name: posts
    label: Posts
    folder: _posts
    fields:
      - name: title
        label: Title
        widget: string
`;

  it('reports valid for a config that passes the schema validator', async () => {
    const { validateConfigYaml } = await import('@/core/lib/configEditorValidation');

    const result = validateConfigYaml(validYaml);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.config?.media_folder).toBe('static/images');
  });

  it('reports a parse error for invalid YAML without ever calling validateConfig', async () => {
    const { validateConfigYaml } = await import('@/core/lib/configEditorValidation');

    const result = validateConfigYaml('backend:\n  name: git-gateway\n  bad indent\n- oops');

    expect(result.valid).toBe(false);
    expect(result.config).toBeUndefined();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.schemaErrors).toBeUndefined();
  });

  it('reports schema errors for YAML missing a required backend', async () => {
    const { validateConfigYaml } = await import('@/core/lib/configEditorValidation');

    const result = validateConfigYaml('media_folder: static/images\n');

    expect(result.valid).toBe(false);
    expect(result.config).toBeUndefined();
    expect(result.errors.join(' ')).toMatch(/backend/i);
  });

  it('rejects an empty document', async () => {
    const { validateConfigYaml } = await import('@/core/lib/configEditorValidation');

    const result = validateConfigYaml('');

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['Config cannot be empty.']);
  });

  it('rejects a YAML scalar/list root instead of a mapping', async () => {
    const { validateConfigYaml } = await import('@/core/lib/configEditorValidation');

    const scalar = validateConfigYaml('just a string');
    const list = validateConfigYaml('- one\n- two\n');

    expect(scalar.valid).toBe(false);
    expect(list.valid).toBe(false);
  });

  it('never returns valid:true when the parsed config would fail validateConfig', async () => {
    const { validateConfigYaml } = await import('@/core/lib/configEditorValidation');

    // Two sortable_fields both marked default_sort - validateConfig's custom
    // (non-JSON-Schema) check, exercised here to prove the guard reuses ALL
    // of validateConfig's checks, not just the ajv-driven ones.
    const result = validateConfigYaml(`
backend:
  name: git-gateway
media_folder: static/images
collections:
  - name: posts
    label: Posts
    folder: _posts
    sortable_fields:
      - { field: title, default_sort: asc }
      - { field: date, default_sort: desc }
    fields:
      - name: title
        label: Title
        widget: string
`);

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/default_sort/i);
  });
});

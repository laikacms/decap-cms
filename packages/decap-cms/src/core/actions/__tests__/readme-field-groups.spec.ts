import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { expandFieldGroups, parseConfig } from '@/core/actions/config';
import { registerEntryCodec } from '@/core/lib/registry';
import { yamlEntryCodec } from '@/entry-codecs/yaml/index';

// Core no longer bundles a YAML parser by default (each test file is an
// isolated module registry); config.yml parsing goes through the registered
// yaml entry codec, same as config.spec.ts.
registerEntryCodec(yamlEntryCodec);

/**
 * Pinning test for DCMS-1778: `packages/decap-cms/src/core/README.md`
 * documents the top-level `field_groups` map and the `{ group: '<name>' }`
 * shorthand (including nested use inside `object`/`list` fields). This
 * extracts the exact YAML sample from the README's "Top-level `field_groups`"
 * section and asserts it round-trips through `expandFieldGroups` the way the
 * docs claim, so a future edit that breaks the documented example (or drifts
 * from the real expansion behavior) fails loudly here instead of silently.
 */

const readmePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../README.md',
);

function extractFieldGroupsSample(readme: string): string {
  const heading = "### Top-level `field_groups`";
  const headingIndex = readme.indexOf(heading);
  expect(headingIndex).toBeGreaterThan(-1);

  const afterHeading = readme.slice(headingIndex);
  const fenceMatch = afterHeading.match(/```yaml\n([\s\S]*?)\n```/);
  expect(fenceMatch).not.toBeNull();

  return fenceMatch![1];
}

describe('core README field_groups documentation', () => {
  const sample = extractFieldGroupsSample(readFileSync(readmePath, 'utf8'));
  const config = parseConfig(sample) as {
    field_groups: Record<string, unknown[]>;
    collections: { name: string; fields: unknown[] }[];
  };

  it('parses into a field_groups map and a collection using it', () => {
    expect(config.field_groups.seo).toEqual([
      { name: 'seo_title', label: 'SEO Title', widget: 'string', required: false },
      { name: 'seo_description', label: 'SEO Description', widget: 'text', required: false },
    ]);
    expect(config.collections[0].name).toBe('posts');
  });

  it('expands the top-level {group: seo} reference and the one nested inside the list field', () => {
    const [postsCollection] = config.collections;
    const expanded = expandFieldGroups(
      postsCollection.fields as never,
      config.field_groups as never,
    );

    expect(expanded).toEqual([
      { name: 'title', label: 'Title', widget: 'string' },
      { name: 'seo_title', label: 'SEO Title', widget: 'string', required: false },
      { name: 'seo_description', label: 'SEO Description', widget: 'text', required: false },
      {
        name: 'sections',
        label: 'Sections',
        widget: 'list',
        fields: [
          { name: 'seo_title', label: 'SEO Title', widget: 'string', required: false },
          { name: 'seo_description', label: 'SEO Description', widget: 'text', required: false },
        ],
      },
    ]);
  });

  it('deep-clones the group on each expansion so the two usages do not share field objects', () => {
    const [postsCollection] = config.collections;
    const expanded = expandFieldGroups(
      postsCollection.fields as never,
      config.field_groups as never,
    ) as Array<{ name?: string; fields?: Array<{ name?: string }> }>;

    const topLevelSeoTitle = expanded[1];
    const nestedSeoTitle = expanded[3].fields![0];

    expect(topLevelSeoTitle).not.toBe(nestedSeoTitle);
    expect(topLevelSeoTitle).toEqual(nestedSeoTitle);
  });
});

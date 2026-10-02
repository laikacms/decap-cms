vi.mock('../registry');

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'yaml';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getEntryCodec, getEntryCodecs, getWidgets } from '@/core/lib/registry';
import { validateConfig } from '@/core/lib/validateConfig';
import { jsonEntryCodec, jsonFrontmatterCodec } from '@/entry-codecs/json/index';
import { createMarkdownEntryCodec } from '@/entry-codecs/markdown/index';
import { tomlEntryCodec, tomlFrontmatterCodec } from '@/entry-codecs/toml/index';
import { yamlEntryCodec, yamlFrontmatterCodec } from '@/entry-codecs/yaml/index';

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
vi.mocked(getWidgets).mockImplementation(() => [{}]);

// The dev-test fixture is the canonical "does the lib boot" smoke; a validator
// rule that rejects it leaves the demo admin unable to mount (DCMS-2588).
describe('dev-test/config.yml', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('passes validateConfig', () => {
    const raw = readFileSync(resolve(__dirname, '../../../../dev-test/config.yml'), 'utf8');
    const config = yaml.parse(raw) as Record<string, unknown>;
    expect(() => validateConfig(config)).not.toThrow();
  });
});

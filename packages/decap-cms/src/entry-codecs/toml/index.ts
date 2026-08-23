import dayjs from 'dayjs';
import { isPlainObject } from 'lodash-es';
import { parse, stringify } from 'smol-toml';

import { sortKeys } from '@/core/formats/helpers';
import AssetProxy from '@/core/valueObjects/AssetProxy';

import type { CmsEntryCodec, CmsFormatterFunctions, CmsFrontmatterCodec } from '@/lib/util/index';
import type { Dayjs } from 'dayjs';

/**
 * `decap-cms/entry-codecs/toml` — the TOML entry codec
 * (`format: toml`, `.toml` files). Register with
 * `CMS.registerEntryCodec(tomlEntryCodec)`; the fat `/app` and `/laika-app`
 * entries do so out of the box. To use TOML as a frontmatter language, pass
 * `tomlFrontmatterCodec` to `createMarkdownEntryCodec`.
 */

// smol-toml's `stringify` has no replacer/sort hooks (the pre-fork tomlify
// ones), so replacements and key ordering are applied to a prepared copy of
// the data instead: dayjs values render with their stored format, AssetProxy
// values collapse to their path, and object keys are emitted in `sortedKeys`
// order (insertion order controls smol-toml's output order).
function prepare(value: unknown, sortedKeys: string[]): unknown {
  if (dayjs.isDayjs(value)) {
    return value.format((value as Dayjs & { _f?: string })._f);
  }
  if (value instanceof AssetProxy) {
    return `${value.path}`;
  }
  if (Array.isArray(value)) {
    return value.map(item => prepare(item, sortedKeys));
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value as object).sort(sortKeys(sortedKeys, ([key]) => key));
    return Object.fromEntries(entries.map(([key, item]) => [key, prepare(item, sortedKeys)]));
  }
  return value;
}

export const tomlFormatter: CmsFormatterFunctions = {
  fromFile(content: string) {
    return parse(content);
  },

  toFile(data: object, sortedKeys: string[] = []) {
    let result = stringify(prepare(data, sortedKeys) as object);
    // smol-toml renders inline arrays with surrounding spaces (e.g. `[ "a", "b" ]`).
    // Normalize to compact spacing (`["a", "b"]`) and trim the trailing newline.
    result = result.replace(/= \[ /g, '= [').replace(/ \](?=\n|$)/g, ']');
    return result.replace(/\n$/, '');
  },
};

export const tomlEntryCodec: CmsEntryCodec = {
  name: 'toml',
  fileExtensions: ['toml'],
  defaultExtension: 'toml',
  formatter: tomlFormatter,
};

/** TOML as a frontmatter language (`+++` fences) for `createMarkdownEntryCodec`. */
export const tomlFrontmatterCodec: CmsFrontmatterCodec = {
  codec: tomlEntryCodec,
  delimiters: ['+++', '+++'],
};

export default tomlEntryCodec;

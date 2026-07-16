import { isDate } from 'lodash-es';
import yaml from 'yaml';
import { Schema } from 'yaml';
import { createNode } from 'yaml/util';

import { sortKeys } from '@/core/formats/helpers';

import type { CmsEntryCodec, CmsFormatterFunctions, CmsFrontmatterCodec } from '@/lib/util/index';
import type { Node, Pair, YAMLMap, YAMLSeq } from 'yaml';
import type { CreateNodeContext } from 'yaml/util';

/**
 * `@laikacms/decap-cms/entry-codecs/yaml` — the YAML entry codec
 * (`format: yml`/`yaml`, `.yml`/`.yaml` files). Register with
 * `CMS.registerEntryCodec(yamlEntryCodec)`; the fat `/app` and `/laika-app`
 * entries do so out of the box. To use YAML as a frontmatter language, pass
 * `yamlFrontmatterCodec` to `createMarkdownEntryCodec`.
 */

const createNodeContext: CreateNodeContext = {
  aliasDuplicateObjects: false,
  keepUndefined: false,
  onAnchor: () => '',
  sourceObjects: new Map(),
  schema: new Schema({ customTags: [] }),
};

function addComments(items: Array<Pair>, comments: Record<string, string>, prefix = '') {
  items.forEach(item => {
    if (item.key !== undefined && item.key !== null) {
      const itemKey = item.key.toString();
      const key = prefix ? `${prefix}.${itemKey}` : itemKey;
      if (comments[key]) {
        const value = comments[key].split('\\n').join('\n ');
        (item.key as any).commentBefore = ` ${value}`;
      }
      if (Array.isArray((item.value as YAMLMap | YAMLSeq | undefined)?.items)) {
        addComments((item.value as YAMLMap | YAMLSeq).items as Array<Pair>, comments, key);
      }
    }
  });
}

const timestampTag = {
  identify: (value: unknown) => value instanceof Date,
  default: true,
  tag: '!timestamp',
  test: RegExp(
    '^'
      + '([0-9]{4})-([0-9]{2})-([0-9]{2})' // YYYY-MM-DD
      + 'T' // T
      + '([0-9]{2}):([0-9]{2}):([0-9]{2}(\\.[0-9]+)?)' // HH:MM:SS(.ss)?
      + 'Z' // Z
      + '$',
  ),
  resolve: (str: string) => new Date(str),
  stringify: (value: Node) => (isDate(value) ? value.toISOString() : ''),
} as const;

export const yamlFormatter: CmsFormatterFunctions = {
  fromFile(content: string) {
    if (content && content.trim().endsWith('---')) {
      content = content.trim().slice(0, -3);
    }

    const doc = yaml.parseDocument(content, {
      customTags: [timestampTag],
      prettyErrors: true,
    });

    for (const warn of doc.warnings) {
      console.warn(`YAML warning: ${warn.message}`);
    }

    if (doc.errors.length > 0) {
      const messages = doc.errors.map(e => e.message).join('\n');
      throw new Error(`YAML parsing error:\n${messages}`);
    }

    return doc.toJS();
  },

  toFile(data: object, sortedKeys: string[] = [], comments: Record<string, string> = {}) {
    const contents = createNode(data, undefined, createNodeContext) as YAMLMap | YAMLSeq;

    addComments(contents.items as Array<Pair>, comments);

    contents.items.sort(sortKeys(sortedKeys, item => (item as Pair).key?.toString() ?? ''));
    const doc = new yaml.Document();
    doc.contents = contents;

    return doc.toString();
  },
};

export const yamlEntryCodec: CmsEntryCodec = {
  name: 'yaml',
  aliases: ['yml'],
  fileExtensions: ['yml', 'yaml'],
  defaultExtension: 'yml',
  formatter: yamlFormatter,
  // CMS config files (config.yml) allow merge keys and unbounded aliases,
  // which entry parsing does not.
  parseConfig: (text: string) => yaml.parse(text, { maxAliasCount: -1, prettyErrors: true, merge: true }),
};

/** YAML as a frontmatter language (`---` fences) for `createMarkdownEntryCodec`. */
export const yamlFrontmatterCodec: CmsFrontmatterCodec = {
  codec: yamlEntryCodec,
  delimiters: ['---', '---'],
};

export default yamlEntryCodec;

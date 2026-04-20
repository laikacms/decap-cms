import yaml from 'yaml';

import { sortKeys } from './helpers';

import type { CreateNodeContext } from 'yaml/util';
import { createNode } from 'yaml/util';
import type { YAMLMap, YAMLSeq, Pair, Node} from 'yaml';
import { Schema } from 'yaml';
import { isDate } from 'lodash';

const createNodeContext: CreateNodeContext = {
  aliasDuplicateObjects: false,
  keepUndefined: false,
  onAnchor: () => '',
  sourceObjects: new Map(),
  schema: new Schema({ customTags: [] }),
}

function addComments(items: Array<Pair>, comments: Record<string, string>, prefix = '') {
  items.forEach(item => {
    if (item.key !== undefined && item.key !== null) {
      const itemKey = item.key.toString();
      const key = prefix ? `${prefix}.${itemKey}` : itemKey;
      if (comments[key]) {
        const value = comments[key].split('\\n').join('\n ');
        // @ts-expect-error
        item.commentBefore = ` ${value}`;
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
    '^' +
      '([0-9]{4})-([0-9]{2})-([0-9]{2})' + // YYYY-MM-DD
      'T' + // T
      '([0-9]{2}):([0-9]{2}):([0-9]{2}(\\.[0-9]+)?)' + // HH:MM:SS(.ss)?
      'Z' + // Z
      '$',
  ),
  resolve: (str: string) => new Date(str),
  stringify: (value: Node) => isDate(value) ? value.toISOString() : '',
} as const;

export default {
  fromFile(content: string) {
    if (content && content.trim().endsWith('---')) {
      content = content.trim().slice(0, -3);
    }
    return yaml.parse(content, { customTags: [timestampTag] });
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

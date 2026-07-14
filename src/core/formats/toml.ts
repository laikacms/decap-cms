import { parse, stringify } from 'smol-toml';
import dayjs from 'dayjs';

import AssetProxy from '@/core/valueObjects/AssetProxy';
import { sortKeys } from './helpers';

function outputReplacer(_key: string, value: unknown) {
  if (dayjs.isDayjs(value)) {
    // @ts-expect-error -- TODO: fix underlying type issue
    return value.format(value._f);
  }
  if (value instanceof AssetProxy) {
    return `${value.path}`;
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value.toString();
  }
  // Return `false` to use default (`undefined` would delete key).
  return false;
}

export default {
  fromFile(content: string) {
    return parse(content);
  },

  toFile(data: object, sortedKeys: string[] = []) {
    let result = stringify(data); // TODO: add support for outputReplacer and sortKeys
    // smol-toml renders inline arrays with surrounding spaces (e.g. `[ "a", "b" ]`).
    // Normalize to compact spacing (`["a", "b"]`) and trim the trailing newline.
    result = result.replace(/= \[ /g, '= [').replace(/ \](?=\n|$)/g, ']');
    return result.replace(/\n$/, '');
    // return stringify(data, { replace: outputReplacer, sort: sortKeys(sortedKeys) });
  },
};

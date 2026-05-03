import { parse, stringify } from 'smol-toml';
import dayjs from 'dayjs';

import AssetProxy from '../valueObjects/AssetProxy';
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
    // Return the string representation of integers so tomlify won't render with tenths (".0")
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
    return stringify(data); // TODO: add support for outputReplacer and sortKeys
    // return stringify(data, { replace: outputReplacer, sort: sortKeys(sortedKeys) });
  },
};

import { parse, stringify } from 'smol-toml';

export default {
  fromFile(content: string) {
    return parse(content);
  },

  toFile(data: object, _sortedKeys: string[] = []) {
    // smol-toml renders inline arrays with surrounding spaces (e.g.
    // `[ "a", "b" ]`). Normalize to compact spacing and trim the trailing
    // newline so `toFile` matches the gray-matter contract callers expect.
    const result = stringify(data)
      .replace(/= \[ /g, '= [')
      .replace(/ \](?=\n|$)/g, ']');
    return result.replace(/\n$/, '');
  },
};

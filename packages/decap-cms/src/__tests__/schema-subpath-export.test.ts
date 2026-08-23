import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// README.md ("JSON Schema (editor autocompletion)") advertises the config.yml
// JSON Schema as importable at the package subpath
// `decap-cms/schema/config.schema.json`. Node's `exports` map,
// once present in package.json, blocks resolution of any subpath that isn't
// explicitly listed there — without a `./schema/*` (or equivalent) entry,
// `require.resolve('decap-cms/schema/config.schema.json')` /
// `import(...)` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`, contradicting the
// README's promise (DCMS-1647).
//
// This pins that the subpath actually resolves via Node's package resolution
// algorithm (not just a filesystem existsSync check, which would pass even
// if `exports` blocked it).

const require = createRequire(import.meta.url);

describe('package.json#exports "./schema/*" (DCMS-1649)', () => {
  it('resolves decap-cms/schema/config.schema.json without throwing', () => {
    expect(() => require.resolve('decap-cms/schema/config.schema.json')).not.toThrow();
  });
});

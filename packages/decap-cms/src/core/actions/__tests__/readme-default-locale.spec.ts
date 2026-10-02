import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { applyDefaults } from '@/core/actions/config';

/**
 * Pinning test for DCMS-2540: the `i18n.default_locale` bullet in
 * `packages/decap-cms/src/core/README.md` must describe the real behavior
 * (config apply throws when the default locale is not in `locales`), not the
 * old claim that an unlisted value produces "no validation error".
 */

const readme = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../README.md'),
  'utf8',
);

function defaultLocaleBullet(): string {
  const start = readme.indexOf('- **`i18n.default_locale`**');
  expect(start).toBeGreaterThan(-1);
  const end = readme.indexOf('\n\n', start);
  return readme.slice(start, end).replace(/\s+/g, ' ');
}

describe('README i18n.default_locale docs pinning (DCMS-2540)', () => {
  it('no longer claims an unlisted default_locale gives no validation error', () => {
    expect(defaultLocaleBullet()).not.toContain('no validation error');
  });

  it('documents the thrown message, matching the real error', () => {
    const message = "i18n locales 'en, de' are missing the default locale fr";
    expect(() =>
      applyDefaults({
        i18n: { structure: 'multiple_folders', locales: ['en', 'de'], default_locale: 'fr' },
        collections: [{ folder: 'foo', fields: [{ name: 'title', widget: 'string' }] }],
      } as never),
    ).toThrow(message);
    expect(defaultLocaleBullet()).toContain(message);
  });
});

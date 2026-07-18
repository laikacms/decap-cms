import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// SECURITY.md lives at the repo root, four levels up from this test file
// (src/__tests__ -> src -> packages/decap-cms -> packages -> repo root).
// Anchor on import.meta.url instead of __dirname: the __dirname shim vitest
// injects for ESM sources resolves to a different segment count on Windows.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const SECURITY_MD_PATH = path.join(REPO_ROOT, 'SECURITY.md');
const PACKAGE_JSON_PATH = path.join(HERE, '../../package.json');

describe('SECURITY.md#supported-versions', () => {
  it('lists the published package\'s current major version as "Actively Supported"', () => {
    const { version } = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8')) as { version: string };
    const major = version.split('.')[0];

    const securityMd = fs.readFileSync(SECURITY_MD_PATH, 'utf8');

    const rowPattern = new RegExp(`\\|\\s*${major}\\.x\\s*\\|[^|]*Actively Supported`);

    // If this fails, packages/decap-cms/package.json crossed a major version
    // boundary and SECURITY.md's Supported Versions table wasn't updated to
    // match. Update the table so the currently-shipped major is the row
    // marked "Actively Supported", and fold the previous major down to
    // unsupported/legacy.
    expect(securityMd).toMatch(rowPattern);
  });
});

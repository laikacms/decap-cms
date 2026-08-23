import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * breaking-changes-v4-beta.md's `markdown` → `richtext` section (DCMS-483)
 * used to promise the `markdown` back-compat alias "remains registered ...
 * for one minor version". The alias (`app/extensions.ts`,
 * `core/lib/registry.tsx`'s `resolveWidget`) has
 * no expiry logic — it's wired in unconditionally, with only a one-time
 * console.warn — so the doc's removal-timeline promise had gone stale well
 * past one minor version (DCMS-1886). This pins the doc to accurate,
 * indefinite-shim wording so the timeline claim can't silently regress.
 *
 * When this test fails because the alias really was scheduled/removed:
 * update the doc to describe the real removal plan, then update this test
 * to match.
 */

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../../../../../..');

const breakingChangesDocPath = path.resolve(
  repoRoot,
  'docs/contributing/decisions/breaking-changes-v4-beta.md',
);
const breakingChangesDoc = readFileSync(breakingChangesDocPath, 'utf8');

describe('breaking-changes-v4-beta.md markdown alias section (DCMS-1886)', () => {
  it('does not promise the markdown alias is removed after one minor version', () => {
    expect(breakingChangesDoc).not.toMatch(/for one minor version/i);
  });

  it('describes the markdown alias as an indefinite back-compat shim', () => {
    expect(breakingChangesDoc).toContain(
      '`markdown` remains registered (DCMS-483) as an indefinite compatibility shim with no scheduled\nremoval date',
    );
  });
});

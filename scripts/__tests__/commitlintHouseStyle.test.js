const fs = require('fs');
const path = require('path');
const load = require('@commitlint/load').default;
const lint = require('@commitlint/lint').default;

/**
 * Pins the actual enforcement gap described in
 * https://github.com/laikacms/decap-cms/issues/1671 (DCMS-1671):
 *
 * CONTRIBUTING.md documents scope slugs and a `(DCMS-nnn)` ticket suffix as a
 * commit-message convention, but commitlint.config.js only extends
 * `@commitlint/config-conventional`, which has no `scope-enum` rule and no
 * rule requiring a ticket suffix. Both are checked by reviewers, not by the
 * commit-msg hook.
 *
 * If someone later adds real scope/ticket enforcement to commitlint.config.js
 * without updating CONTRIBUTING.md (or vice versa), this test should start
 * failing so the drift gets noticed.
 */

const ROOT_DIR = path.join(__dirname, '..', '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'commitlint.config.js');
const CONTRIBUTING_PATH = path.join(ROOT_DIR, 'CONTRIBUTING.md');

describe('commitlint house-style enforcement (DCMS-1671)', () => {
  it('commitlint.config.js only extends config-conventional (no custom rules object)', () => {
    const config = require(CONFIG_PATH);
    expect(config.extends).toEqual(['@commitlint/config-conventional']);
    expect(config.rules).toBeUndefined();
    expect(config.plugins).toBeUndefined();
  });

  it('the resolved rule set has no scope-enum rule', async () => {
    const { rules } = await load({}, { file: CONFIG_PATH });
    expect(rules['scope-enum']).toBeUndefined();
  });

  it('a commit with no scope passes commitlint despite the documented house style', async () => {
    const { rules } = await load({}, { file: CONFIG_PATH });
    const report = await lint('fix: drop unused import', rules);
    expect(report.valid).toBe(true);
    expect(report.errors).toEqual([]);
  });

  it('a commit with a made-up, non-existent scope passes commitlint', async () => {
    const { rules } = await load({}, { file: CONFIG_PATH });
    const report = await lint('feat(bogus-scope-that-does-not-exist): whatever', rules);
    expect(report.valid).toBe(true);
    expect(report.errors).toEqual([]);
  });

  it('a commit with no (DCMS-nnn) ticket suffix passes commitlint', async () => {
    const { rules } = await load({}, { file: CONFIG_PATH });
    const report = await lint('chore: bump a transitive dependency', rules);
    expect(report.valid).toBe(true);
    expect(report.errors).toEqual([]);
  });

  it('CONTRIBUTING.md states the scope/ticket-suffix convention is review-checked, not commitlint-enforced', () => {
    const contributing = fs.readFileSync(CONTRIBUTING_PATH, 'utf8');
    const section = contributing.split('### Commit messages')[1];
    expect(section).toBeDefined();
    expect(section).toMatch(/not enforced by\s+commitlint/i);
    expect(section).toMatch(/scope-enum/);
    expect(section).toMatch(/DCMS-nnn/);
  });
});

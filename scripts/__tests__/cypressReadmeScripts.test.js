const fs = require('fs');
const path = require('path');

/**
 * Pins the claims made in cypress/Readme.md's "Debug Tests" section against the
 * actual npm scripts in package.json, so the doc and the scripts can't silently
 * diverge again.
 *
 * @see https://github.com/laikacms/decap-cms/issues/664 (DCMS-558)
 */

const ROOT_DIR = path.join(__dirname, '..', '..');
const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
const readme = fs.readFileSync(path.join(ROOT_DIR, 'cypress', 'Readme.md'), 'utf8');

describe('cypress/Readme.md Debug Tests section', () => {
  it('test:e2e:exec is headless, matching the corrected doc wording', () => {
    expect(pkgJson.scripts['test:e2e:exec']).toContain('--headless');
  });

  it('test:e2e:exec-dev opens the interactive Cypress App (no --headless flag)', () => {
    expect(pkgJson.scripts['test:e2e:exec-dev']).toContain('cypress open');
    expect(pkgJson.scripts['test:e2e:exec-dev']).not.toContain('--headless');
  });

  it('does not claim test:e2e:exec is non-headless', () => {
    const debugSection = readme.split('## Debug Tests')[1].split('## Recording Tests Data')[0];
    expect(debugSection).not.toMatch(/test:e2e:exec\b[^-]*non-headless/);
  });

  it('points contributors at test:e2e:exec-dev for interactive debugging', () => {
    const debugSection = readme.split('## Debug Tests')[1].split('## Recording Tests Data')[0];
    expect(debugSection).toMatch(/test:e2e:exec-dev/);
  });
});

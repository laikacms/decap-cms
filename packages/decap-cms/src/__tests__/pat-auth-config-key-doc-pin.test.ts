import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// DCMS-2205: `backend.pat_auth` is a real, working config key — wired into
// six backends' `AuthenticationPage.tsx` (each does
// `config.backend.pat_auth ? () => <PatLoginForm .../> : undefined` as
// `renderPageContent`) and declared on the shared `CmsBackend` type
// (`lib/util/types/cms/backend.ts`) — but was undocumented anywhere: no
// backend README, no docs/ page, no config.schema.json property mentioned it.
//
// This pins the fix: every backend whose `AuthenticationPage.tsx` reads
// `pat_auth` must document it in its README's `backend:` config keys
// section.
const packageRoot = path.resolve(__dirname, '..');

const PAT_AUTH_BACKENDS = ['azure', 'bitbucket', 'forgejo', 'gitea', 'github', 'gitlab'];

describe('backend.pat_auth config key doc pin (DCMS-2205)', () => {
  it.each(PAT_AUTH_BACKENDS)(
    '%s/AuthenticationPage.tsx reading pat_auth implies %s/README.md documents it',
    backend => {
      const authPagePath = path.join(packageRoot, `backends/${backend}/AuthenticationPage.tsx`);
      const readmePath = path.join(packageRoot, `backends/${backend}/README.md`);

      const authPage = readFileSync(authPagePath, 'utf8');
      // Sanity check: fail closed if the wiring this test pins ever moves or
      // is renamed, instead of silently passing on both backends.
      expect(authPage).toMatch(/pat_auth/);

      const readme = readFileSync(readmePath, 'utf8');
      expect(readme).toMatch(/`pat_auth`/);
    },
  );
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// DCMS-1981: the laika backend README's Config table listed only `name`,
// `base_url`, `api_root`, `api_url`, `dev_token` — omitting the five
// `backend:` keys `PKCEAuthenticationPage.componentDidMount`
// (src/backends/laika/AuthenticationPage.tsx) actually reads to drive the
// real (non-dev-token) OAuth login path: `app_id`, `auth_endpoint`,
// `auth_token_endpoint`, `auth_token_endpoint_content_type`, `use_oidc`.
// `app_id` is *required* for real OAuth login (missing it produces a
// runtime-only loginError with no doc pointer to the fix), yet the table's
// "Required" column implied it was documenting the full set.
//
// This pins the fix: the backend README's Config table must mention all
// five keys, and the generic PKCE config doc (src/lib/auth/README.md) must
// list `laika` among its `PkceAuthenticatorConfig` consumers.

const packageRoot = path.resolve(__dirname, '..');
const laikaReadmePath = path.join(packageRoot, 'backends/laika/README.md');
const authReadmePath = path.join(packageRoot, 'lib/auth/README.md');

describe('laika backend OAuth config keys doc pin (DCMS-1981)', () => {
  it("backend README's Config table documents the OAuth-only keys read by PKCEAuthenticationPage", () => {
    const laikaReadme = readFileSync(laikaReadmePath, 'utf8');

    expect(laikaReadme).toMatch(/`app_id`/);
    expect(laikaReadme).toMatch(/`auth_endpoint`/);
    expect(laikaReadme).toMatch(/`auth_token_endpoint`/);
    expect(laikaReadme).toMatch(/`auth_token_endpoint_content_type`/);
    expect(laikaReadme).toMatch(/`use_oidc`/);
    // app_id is required for the real (non-dev-token) OAuth path; the table
    // must say so, not just list it as another optional key.
    expect(laikaReadme).toMatch(/app_id[\s\S]{0,80}\*\*yes, for OAuth\*\*/);
  });

  it("lib/auth README's PkceAuthenticatorConfig consumer list includes laika", () => {
    const authReadme = readFileSync(authReadmePath, 'utf8');

    expect(authReadme).toMatch(/\*\*`laika`\*\*/);
    expect(authReadme).toMatch(/backends\/laika\/AuthenticationPage\.tsx/);
  });
});

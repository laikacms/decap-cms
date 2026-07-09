// Compile-time assertions for CmsBackend.auth_scope / CmsAuthScope.
//
// 'repo' and 'public_repo' are the documented defaults, but the github
// backend (AuthenticationPage.js) passes auth_scope straight through to the
// GitHub OAuth `scope` param with no allowlist, so arbitrary GitHub OAuth
// scope strings are valid at runtime too. See DCMS-419.
//
// Included by tsc via the src glob in tsconfig but not picked up by Jest
// (no .spec/.test suffix and not inside __tests__).

import type { CmsBackend } from './redux';

// Documented literals — must still compile and autocomplete.
const _repo: CmsBackend['auth_scope'] = 'repo';
const _publicRepo: CmsBackend['auth_scope'] = 'public_repo';

// Arbitrary GitHub OAuth scope strings — must also compile (runtime accepts
// any scope, e.g. per AuthenticationPage.spec.js's 'repo:status' case).
const _repoStatus: CmsBackend['auth_scope'] = 'repo:status';
const _readOrg: CmsBackend['auth_scope'] = 'read:org';
const _adminRepoHook: CmsBackend['auth_scope'] = 'admin:repo_hook';

// Silence noUnusedLocals.
void _repo, _publicRepo, _repoStatus, _readOrg, _adminRepoHook;

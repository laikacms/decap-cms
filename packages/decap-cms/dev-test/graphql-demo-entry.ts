/**
 * Demo entry for `dist/decap-cms-graphql.js`: the classic app bundle plus the
 * opt-in GraphQL backends registered, mirroring what a consumer does with
 * `registerGitHubGraphQL()` from `@laikacms/decap-cms/backends/github/graphql`. Used by the
 * `dev-test/backends/github-graphql/` page (and the GraphQL replay e2e suite)
 * — the plain `decap-cms.js` demo bundle intentionally excludes apollo.
 */
import { registerGitHubGraphQL } from '@/backends/github/graphql/index';
import { registerGitLabGraphQL } from '@/backends/gitlab/graphql/index';

registerGitHubGraphQL();
registerGitLabGraphQL();

export * from '@/app/index';

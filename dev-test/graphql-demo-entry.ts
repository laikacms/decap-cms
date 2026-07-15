/**
 * Demo entry for `dist/decap-cms-graphql.js`: the classic app bundle plus the
 * opt-in GraphQL backends registered, mirroring what a consumer does with
 * `import '@laikacms/decap-cms/backends/github/graphql'`. Used by the
 * `dev-test/backends/github-graphql/` page (and the GraphQL replay e2e suite)
 * — the plain `decap-cms.js` demo bundle intentionally excludes apollo.
 */
import '@/backends/github/graphql/index';
import '@/backends/gitlab/graphql/index';

export * from '@/app/index';
export { default } from '@/app/index';

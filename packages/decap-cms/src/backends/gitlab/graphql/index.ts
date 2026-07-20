/**
 * Opt-in GraphQL support for the GitLab backend. Call `registerGitLabGraphQL()`
 * before `init()` so `use_graphql: true` works. It is a separate entry point
 * because the GraphQL client libraries (graphql, graphql-tag, @apollo/client)
 * are optional peer dependencies — only consumers that import this entry need
 * to install them.
 */
import { once } from 'lodash-es';

import GraphQLAPI from '@/backends/gitlab/GraphQLAPI';
import { registerGraphQLAPI } from '@/backends/gitlab/implementation';

/** Register the GitLab GraphQL API class. Explicit and idempotent. */
export const registerGitLabGraphQL = once(function registerGitLabGraphQL(): void {
  registerGraphQLAPI(GraphQLAPI);
});

export { GraphQLAPI };
export default GraphQLAPI;

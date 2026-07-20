/**
 * Opt-in GraphQL support for the GitHub backend. Call `registerGitHubGraphQL()`
 * before `init()` so `use_graphql: true` works. It is a separate entry point
 * because the GraphQL client libraries (graphql, graphql-tag, @apollo/client)
 * are optional peer dependencies — only consumers that import this entry need
 * to install them.
 */
import { once } from 'lodash-es';

import GraphQLAPI from '@/backends/github/GraphQLAPI';
import { registerGraphQLAPI } from '@/backends/github/implementation';

/** Register the GitHub GraphQL API class. Explicit and idempotent. */
export const registerGitHubGraphQL = once(function registerGitHubGraphQL(): void {
  registerGraphQLAPI(GraphQLAPI);
});

export { GraphQLAPI };
export default GraphQLAPI;

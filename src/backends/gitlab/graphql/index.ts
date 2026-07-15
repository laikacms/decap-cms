/**
 * Opt-in GraphQL support for the GitLab backend. Importing this module registers the
 * GraphQL API class so `use_graphql: true` works. It is a separate entry point because
 * the GraphQL client libraries (graphql, graphql-tag, apollo-*) are optional peer
 * dependencies — only consumers that import this entry need to install them.
 */
import GraphQLAPI from '@/backends/gitlab/GraphQLAPI';
import { registerGraphQLAPI } from '@/backends/gitlab/implementation';

registerGraphQLAPI(GraphQLAPI);

export { GraphQLAPI };
export default GraphQLAPI;

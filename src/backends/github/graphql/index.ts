/**
 * Opt-in GraphQL support for the GitHub backend. Importing this module registers the
 * GraphQL API class so `use_graphql: true` works. It is a separate entry point because
 * the GraphQL client libraries (graphql, graphql-tag, apollo-*) are optional peer
 * dependencies — only consumers that import this entry need to install them.
 */
import GraphQLAPI from '@/backends/github/GraphQLAPI';
import { registerGraphQLAPI } from '@/backends/github/implementation';

registerGraphQLAPI(GraphQLAPI);

export { GraphQLAPI };
export default GraphQLAPI;

import { editorialWorkflowSuite } from './editorialWorkflowSuite';

/**
 * Editorial workflow against the GitHub backend (GraphQL API), replaying the
 * recorded fixtures in `playwright/fixtures/`. Drives the same page as the REST
 * suite but with `backend.use_graphql: true`
 * (dev-test/backends/github-graphql/config.yml).
 */
editorialWorkflowSuite({
  title: 'GitHub Backend Editorial Workflow - GraphQL API',
  pageUrl: '/backends/github-graphql/',
  // The sanitized identity the fixtures were recorded under.
  user: {
    login: 'owner',
    id: 1,
    avatar_url: 'https://avatars1.githubusercontent.com/u/7892489?v=4',
    name: 'owner',
    token: 'fakeToken',
    backendName: 'github',
  },
});

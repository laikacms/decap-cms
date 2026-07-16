import { editorialWorkflowSuite } from './editorialWorkflowSuite';

/**
 * Editorial workflow against the GitHub backend (REST API), replaying the
 * recorded fixtures in `cypress/fixtures/`.
 */
editorialWorkflowSuite({
  title: 'GitHub Backend Editorial Workflow - REST API',
  pageUrl: '/backends/github/',
  // The sanitized identity the fixtures were recorded under
  // (see FAKE_OWNER_USER in cypress/plugins/github.ts).
  user: {
    login: 'owner',
    id: 1,
    avatar_url: 'https://avatars1.githubusercontent.com/u/7892489?v=4',
    name: 'owner',
    token: 'fakeToken',
    backendName: 'github',
  },
});

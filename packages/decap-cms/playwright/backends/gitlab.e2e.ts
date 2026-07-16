import { editorialWorkflowSuite } from './editorialWorkflowSuite';

/**
 * Editorial workflow against the GitLab backend, replaying the recorded
 * fixtures in `cypress/fixtures/`.
 */
editorialWorkflowSuite({
  title: 'GitLab Backend Editorial Workflow',
  pageUrl: '/backends/gitlab/',
  // The sanitized identity the fixtures were recorded under
  // (see FAKE_OWNER_USER in cypress/plugins/gitlab.ts).
  user: {
    id: 1,
    name: 'owner',
    username: 'owner',
    avatar_url: 'https://avatars1.githubusercontent.com/u/7892489?v=4',
    email: 'owner@email.com',
    login: 'owner',
    token: 'fakeToken',
    backendName: 'gitlab',
  },
  skips: {
    // Skipped in the Cypress suite too: the recorded fixture is incomplete
    // (no commit recording for the third entry), so it cannot replay.
    'can change status on and publish multiple entries': 'incomplete recording',
  },
});

import { editorialWorkflowSuite } from './editorialWorkflowSuite';

/**
 * Editorial workflow against the Bitbucket backend, replaying the recorded
 * fixtures in `cypress/fixtures/`.
 */
editorialWorkflowSuite({
  title: 'BitBucket Backend Editorial Workflow',
  pageUrl: '/backends/bitbucket/',
  // The sanitized identity the fixtures were recorded under
  // (see FAKE_OWNER_USER in cypress/plugins/bitbucket.ts).
  user: {
    name: 'owner',
    display_name: 'owner',
    links: {
      avatar: {
        href: 'https://avatars1.githubusercontent.com/u/7892489?v=4',
      },
    },
    nickname: 'owner',
    token: 'fakeToken',
    backendName: 'bitbucket',
  },
  skips: {
    // The recording predates v4's post-publish collection refetch: it has no
    // post-merge directory-listing responses (the recorded app rendered the
    // final list from state), so the refetched listing cannot be replayed.
    'can change status on and publish multiple entries': 'fixture lacks post-merge listings',
  },
});

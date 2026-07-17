import { editorialWorkflowSuite } from './editorialWorkflowSuite';

/**
 * Editorial workflow against git-gateway backed by GitLab, replaying the
 * recorded fixtures in `cypress/fixtures/`. Logs in through the Netlify
 * Identity email/password form (credentials are the sanitized values the
 * fixtures were recorded under, see cypress/plugins/gitGateway.ts).
 */
editorialWorkflowSuite({
  title: 'Git Gateway (GitLab) Backend Editorial Workflow',
  pageUrl: '/backends/git-gateway/',
  netlifySiteURL: 'https://fake-site-url.netlify.com/',
  credentials: { email: 'decap@p-m.si', password: '12345678' },
  skips: {
    // Skipped in the Cypress suite too: the recorded fixture is incomplete
    // (no commit recording for the third entry), so it cannot replay.
    'can change status on and publish multiple entries': 'incomplete recording',
  },
});

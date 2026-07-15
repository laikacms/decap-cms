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
});

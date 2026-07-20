import { editorialWorkflowSuite } from './editorialWorkflowSuite';

/**
 * Editorial workflow against git-gateway backed by GitHub, replaying the
 * recorded fixtures in `playwright/fixtures/`. Logs in through the Netlify
 * Identity email/password form (credentials are the sanitized values the
 * fixtures were recorded under).
 */
editorialWorkflowSuite({
  title: 'Git Gateway (GitHub) Backend Editorial Workflow',
  pageUrl: '/backends/git-gateway/',
  netlifySiteURL: 'https://fake-site-url.netlify.com/',
  credentials: { email: 'decap@p-m.si', password: '12345678' },
});

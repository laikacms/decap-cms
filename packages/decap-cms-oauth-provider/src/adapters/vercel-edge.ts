import { createGitHubOAuthHandler } from '../handler';

/**
 * Vercel Edge Function entrypoint. Deploy under e.g. `api/oauth/[...path].ts`
 * with `export const config = { runtime: 'edge' }` and env vars
 * `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `OAUTH_STATE_SECRET`,
 * `OAUTH_ALLOWED_ORIGINS` set in the Vercel project.
 */
export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  const oauthHandler = createGitHubOAuthHandler({
    clientId: process.env.GITHUB_OAUTH_CLIENT_ID ?? '',
    clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET ?? '',
    stateSecret: process.env.OAUTH_STATE_SECRET ?? '',
    allowedOrigins: (process.env.OAUTH_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean),
    scope: process.env.OAUTH_SCOPE,
    basePath: process.env.OAUTH_BASE_PATH,
  });
  return oauthHandler.fetch(request);
}

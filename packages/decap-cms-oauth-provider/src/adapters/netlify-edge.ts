import { createGitHubOAuthHandler } from '../handler';

/**
 * Netlify Edge Function entrypoint. Deploy under `netlify/edge-functions/oauth.ts`
 * with a matching `[[edge_functions]]` entry in `netlify.toml` pointing at
 * `/oauth/*`, and configure `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`,
 * `OAUTH_STATE_SECRET`, `OAUTH_ALLOWED_ORIGINS` as site environment variables.
 *
 * (No `netlify.toml` changes are shipped in this change - wiring the route is
 * left to the consuming site, per the "no release/publish config" scope guardrail.)
 */
interface NetlifyEdgeContext {
  env: {
    get(key: string): string | undefined;
  };
}

export default async function handler(
  request: Request,
  context: NetlifyEdgeContext,
): Promise<Response> {
  const oauthHandler = createGitHubOAuthHandler({
    clientId: context.env.get('GITHUB_OAUTH_CLIENT_ID') ?? '',
    clientSecret: context.env.get('GITHUB_OAUTH_CLIENT_SECRET') ?? '',
    stateSecret: context.env.get('OAUTH_STATE_SECRET') ?? '',
    allowedOrigins: (context.env.get('OAUTH_ALLOWED_ORIGINS') ?? '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean),
    scope: context.env.get('OAUTH_SCOPE'),
    basePath: context.env.get('OAUTH_BASE_PATH'),
  });
  return oauthHandler.fetch(request);
}

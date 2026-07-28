import { createGitHubOAuthHandler } from '../handler';

/**
 * Cloudflare Workers module-worker entrypoint. Deploy with wrangler and set
 * these as secrets/vars:
 *
 * ```
 * wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
 * wrangler secret put OAUTH_STATE_SECRET
 * ```
 *
 * and in `wrangler.toml`:
 *
 * ```toml
 * [vars]
 * GITHUB_OAUTH_CLIENT_ID = "..."
 * OAUTH_ALLOWED_ORIGINS = "https://cms.example.com"
 * ```
 */
export interface CloudflareOAuthEnv {
  GITHUB_OAUTH_CLIENT_ID: string;
  GITHUB_OAUTH_CLIENT_SECRET: string;
  OAUTH_STATE_SECRET: string;
  OAUTH_ALLOWED_ORIGINS: string;
  OAUTH_SCOPE?: string;
  OAUTH_BASE_PATH?: string;
}

export default {
  async fetch(request: Request, env: CloudflareOAuthEnv): Promise<Response> {
    const handler = createGitHubOAuthHandler({
      clientId: env.GITHUB_OAUTH_CLIENT_ID,
      clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET,
      stateSecret: env.OAUTH_STATE_SECRET,
      allowedOrigins: env.OAUTH_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
      scope: env.OAUTH_SCOPE,
      basePath: env.OAUTH_BASE_PATH,
    });
    return handler.fetch(request);
  },
};

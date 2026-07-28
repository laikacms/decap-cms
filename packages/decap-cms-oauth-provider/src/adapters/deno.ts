import { createGitHubOAuthHandler } from '../handler';

/**
 * Deno Deploy entrypoint. Run with:
 *
 * ```
 * deno run --allow-net --allow-env adapters/deno.ts
 * ```
 *
 * and `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`,
 * `OAUTH_STATE_SECRET`, `OAUTH_ALLOWED_ORIGINS` set as env vars.
 *
 * `Deno` is ambient-global on Deno Deploy; it is declared minimally here so
 * this file type-checks in this Node/TypeScript workspace without pulling in
 * the full Deno type-checking toolchain.
 */
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const oauthHandler = createGitHubOAuthHandler({
  clientId: Deno.env.get('GITHUB_OAUTH_CLIENT_ID') ?? '',
  clientSecret: Deno.env.get('GITHUB_OAUTH_CLIENT_SECRET') ?? '',
  stateSecret: Deno.env.get('OAUTH_STATE_SECRET') ?? '',
  allowedOrigins: (Deno.env.get('OAUTH_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  scope: Deno.env.get('OAUTH_SCOPE'),
  basePath: Deno.env.get('OAUTH_BASE_PATH'),
});

Deno.serve(request => oauthHandler.fetch(request));

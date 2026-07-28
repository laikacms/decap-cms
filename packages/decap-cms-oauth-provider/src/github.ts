const DEFAULT_GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const DEFAULT_GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const DEFAULT_SCOPE = 'repo,user';

export interface BuildAuthorizeUrlOptions {
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
  githubAuthorizeUrl?: string;
}

export function buildAuthorizeUrl(options: BuildAuthorizeUrlOptions): string {
  const url = new URL(options.githubAuthorizeUrl ?? DEFAULT_GITHUB_AUTHORIZE_URL);
  url.searchParams.set('client_id', options.clientId);
  url.searchParams.set('redirect_uri', options.redirectUri);
  url.searchParams.set('scope', options.scope ?? DEFAULT_SCOPE);
  url.searchParams.set('state', options.state);
  return url.toString();
}

export interface ExchangeCodeOptions {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  githubTokenUrl?: string;
}

export class GitHubTokenExchangeError extends Error {}

interface GitHubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * Exchanges an OAuth `code` for an access token. Uses the global `fetch`,
 * so it works unmodified on every WinterCG-compatible runtime.
 */
export async function exchangeCodeForToken(
  options: ExchangeCodeOptions,
): Promise<{ token: string; tokenType: string; scope: string }> {
  const response = await fetch(options.githubTokenUrl ?? DEFAULT_GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: options.clientId,
      client_secret: options.clientSecret,
      code: options.code,
      redirect_uri: options.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new GitHubTokenExchangeError(`GitHub token endpoint responded with ${response.status}`);
  }

  let body: GitHubTokenResponse;
  try {
    body = (await response.json()) as GitHubTokenResponse;
  } catch {
    throw new GitHubTokenExchangeError('GitHub token endpoint returned a non-JSON response');
  }

  if (body.error || !body.access_token) {
    throw new GitHubTokenExchangeError(
      body.error_description ?? body.error ?? 'Missing access_token',
    );
  }

  return {
    token: body.access_token,
    tokenType: body.token_type ?? 'bearer',
    scope: body.scope ?? '',
  };
}

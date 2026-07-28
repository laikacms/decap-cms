import '../test-setup.js';

import { createGitHubOAuthHandler } from '../handler';
import { signState } from '../state';

const CONFIG = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  stateSecret: 'state-secret',
  allowedOrigins: ['https://cms.example.com'],
};

function request(path: string, init?: RequestInit & { referer?: string }): Request {
  const headers = new Headers(init?.headers);
  if (init?.referer) headers.set('Referer', init.referer);
  return new Request(`https://oauth.example.com${path}`, { ...init, headers });
}

describe('createGitHubOAuthHandler', () => {
  it('validates required config', () => {
    expect(() => createGitHubOAuthHandler({ ...CONFIG, clientId: '' })).toThrow('clientId');
    expect(() => createGitHubOAuthHandler({ ...CONFIG, allowedOrigins: [] })).toThrow(
      'allowedOrigins',
    );
  });

  it('responds to the health check without auth', async () => {
    const handler = createGitHubOAuthHandler(CONFIG);
    const res = await handler.fetch(request('/oauth/health'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('404s on an unknown path', async () => {
    const handler = createGitHubOAuthHandler(CONFIG);
    const res = await handler.fetch(request('/oauth/nope'));
    expect(res.status).toBe(404);
  });

  describe('GET /oauth/auth', () => {
    it('redirects to GitHub with a signed state and the callback as redirect_uri', async () => {
      const handler = createGitHubOAuthHandler(CONFIG);
      const res = await handler.fetch(
        request('/oauth/auth?provider=github', { referer: 'https://cms.example.com/admin/' }),
      );
      expect(res.status).toBe(302);
      const location = new URL(res.headers.get('Location')!);
      expect(location.origin + location.pathname).toBe('https://github.com/login/oauth/authorize');
      expect(location.searchParams.get('client_id')).toBe('client-id');
      expect(location.searchParams.get('redirect_uri')).toBe(
        'https://oauth.example.com/oauth/callback',
      );
      expect(location.searchParams.get('state')).toBeTruthy();
    });

    it('rejects an unsupported provider', async () => {
      const handler = createGitHubOAuthHandler(CONFIG);
      const res = await handler.fetch(
        request('/oauth/auth?provider=gitlab', { referer: 'https://cms.example.com/admin/' }),
      );
      expect(res.status).toBe(400);
    });

    it('rejects a request with no Referer/Origin header', async () => {
      const handler = createGitHubOAuthHandler(CONFIG);
      const res = await handler.fetch(request('/oauth/auth'));
      expect(res.status).toBe(400);
    });

    it('rejects a disallowed origin', async () => {
      const handler = createGitHubOAuthHandler(CONFIG);
      const res = await handler.fetch(
        request('/oauth/auth', { referer: 'https://evil.example.com/' }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe('GET /oauth/callback', () => {
    const originalFetch = window.fetch;
    afterEach(() => {
      window.fetch = originalFetch;
    });

    it('exchanges the code and renders a success handshake page', async () => {
      window.fetch = jest.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: 'tok_123', token_type: 'bearer', scope: 'repo' }),
          {
            status: 200,
          },
        ),
      ) as unknown as typeof fetch;

      const handler = createGitHubOAuthHandler(CONFIG);
      const state = await signState(
        { n: 'nonce', o: 'https://cms.example.com', t: Date.now() },
        CONFIG.stateSecret,
      );
      const res = await handler.fetch(request(`/oauth/callback?code=abc&state=${state}`));
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/html');
      const body = await res.text();
      expect(body).toContain('var kind = "success"');
      expect(body).toContain('var provider = "github"');
      expect(body).toContain('tok_123');
    });

    it('renders an error handshake page when GitHub reports an OAuth error', async () => {
      const handler = createGitHubOAuthHandler(CONFIG);
      const state = await signState(
        { n: 'nonce', o: 'https://cms.example.com', t: Date.now() },
        CONFIG.stateSecret,
      );
      const res = await handler.fetch(
        request(
          `/oauth/callback?state=${state}&error=access_denied&error_description=User+declined`,
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('var kind = "error"');
      expect(body).toContain('User declined');
    });

    it('rejects a missing state', async () => {
      const handler = createGitHubOAuthHandler(CONFIG);
      const res = await handler.fetch(request('/oauth/callback?code=abc'));
      expect(res.status).toBe(400);
    });

    it('rejects a tampered state', async () => {
      const handler = createGitHubOAuthHandler(CONFIG);
      const res = await handler.fetch(request('/oauth/callback?code=abc&state=nonsense.nonsense'));
      expect(res.status).toBe(400);
    });

    it('rejects state signed for an origin no longer in the allowlist', async () => {
      const handler = createGitHubOAuthHandler(CONFIG);
      const state = await signState(
        { n: 'nonce', o: 'https://removed.example.com', t: Date.now() },
        CONFIG.stateSecret,
      );
      const res = await handler.fetch(request(`/oauth/callback?code=abc&state=${state}`));
      expect(res.status).toBe(403);
    });

    it('surfaces a token-exchange failure as an error handshake page, not a 500', async () => {
      window.fetch = jest
        .fn()
        .mockResolvedValue(new Response('', { status: 502 })) as unknown as typeof fetch;

      const handler = createGitHubOAuthHandler(CONFIG);
      const state = await signState(
        { n: 'nonce', o: 'https://cms.example.com', t: Date.now() },
        CONFIG.stateSecret,
      );
      const res = await handler.fetch(request(`/oauth/callback?code=abc&state=${state}`));
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('var kind = "error"');
    });
  });
});

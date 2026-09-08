/**
 * Pinning test for `Backend.getToken()` (DCMS-2211).
 *
 * `getToken()` is NOT universally refresh-aware across git backends: the
 * doc (`docs/core/llm.md` "Credentials") and the JSDoc on `currentBackend`
 * (`packages/decap-cms/src/core/index.ts`) previously claimed it was. This
 * test pins the actual, per-implementation contract so a future change to
 * any backend's `getToken()` semantics is caught here rather than silently
 * drifting from the docs again.
 *
 * Each implementation class is instantiated via `Object.create(...prototype)`
 * rather than through its real constructor: `getToken()` on every one of
 * these backends only reads plain instance fields (`token`,
 * `refreshedTokenPromise`, `tokenPromise`), so a full constructor call
 * (config, API clients, auth stores, …) isn't needed to observe it, so this
 * keeps the test hermetic and focused on the one method in question.
 *
 * `git-gateway`'s "delegates entirely to tokenPromise" case above only proves
 * `getToken()` reads whatever `tokenPromise` was last assigned; it says
 * nothing about which `tokenPromise` `authenticate()` actually picks. The
 * `git-gateway: real authenticate() decides the tokenPromise per auth mode`
 * describe block below (DCMS-2220) closes that gap by calling the real
 * `authenticate()` with OAuth-shaped credentials (no `jwt`) and pinning that
 * it installs a static, non-refreshing accessor — the same "no refresh, no
 * dedupe" behavior as `github`/`azure`/`gitea`/`forgejo`, contradicting a
 * prior doc claim that `git-gateway` unconditionally refreshes.
 *
 * `laika` is exercised through its own full-harness spec instead of here:
 * see `packages/decap-cms/src/backends/laika/__tests__/laika-backend.spec.ts`
 * `getToken() returns the current token while it is still fresh` (refresh
 * not needed yet), `getToken() past expiry refreshes via the token endpoint
 * and rewrites storage` (refreshes an expired token), and `concurrent
 * getToken() calls share a single in-flight refresh` (dedupes concurrent
 * refreshes), that suite already pins the "refreshing" contract for laika
 * with the real token-expiry/refresh machinery, which `Object.create` can't
 * exercise meaningfully.
 */
import { describe, expect, it } from 'vitest';

import Azure from '@/backends/azure/implementation';
import Bitbucket from '@/backends/bitbucket/implementation';
import Forgejo from '@/backends/forgejo/implementation';
import GitGateway from '@/backends/git-gateway/implementation';
import Gitea from '@/backends/gitea/implementation';
import GitHub from '@/backends/github/implementation';
import GitLab from '@/backends/gitlab/implementation';
import LocalFsBackend from '@/backends/local-fs/implementation';

// test-only helper to bypass heavyweight constructors: only Ctor.prototype is
// read, so an unknown-args/unknown-instance constructor shape is sufficient.
type AnyConstructor = abstract new(...args: never[]) => unknown;

function instantiate<T extends AnyConstructor>(Ctor: T): InstanceType<T> {
  return Object.create(Ctor.prototype) as InstanceType<T>;
}

describe('getToken() contract (DCMS-2211 pinning test)', () => {
  describe('static accessors: return whatever token was last set, no refresh', () => {
    it('github: returns this.token verbatim, even if it looks stale', async () => {
      const backend = instantiate(GitHub);
      backend.token = 'stale-github-token';

      await expect(backend.getToken()).resolves.toBe('stale-github-token');
    });

    it('azure: returns this.token verbatim, even if it looks stale', async () => {
      const backend = instantiate(Azure);
      backend.token = 'stale-azure-token';

      await expect(backend.getToken()).resolves.toBe('stale-azure-token');
    });

    it('gitea: returns this.token verbatim, even if it looks stale', async () => {
      const backend = instantiate(Gitea);
      backend.token = 'stale-gitea-token';

      await expect(backend.getToken()).resolves.toBe('stale-gitea-token');
    });

    it('forgejo: returns this.token verbatim, even if it looks stale', async () => {
      const backend = instantiate(Forgejo);
      backend.token = 'stale-forgejo-token';

      await expect(backend.getToken()).resolves.toBe('stale-forgejo-token');
    });

    it('local-fs: always resolves to the empty string (no token concept)', async () => {
      const backend = instantiate(LocalFsBackend);

      await expect(backend.getToken()).resolves.toBe('');
    });
  });

  describe('refresh-aware: prefer an in-flight/delegated refresh over the last-set token', () => {
    it('gitlab: returns refreshedTokenPromise when one is in flight, not the stale token', async () => {
      const backend = instantiate(GitLab);
      backend.token = 'stale-gitlab-token';
      backend.refreshedTokenPromise = Promise.resolve('refreshed-gitlab-token');

      await expect(backend.getToken()).resolves.toBe('refreshed-gitlab-token');
    });

    it('gitlab: falls back to this.token when no refresh is in flight', async () => {
      const backend = instantiate(GitLab);
      backend.token = 'current-gitlab-token';
      backend.refreshedTokenPromise = undefined;

      await expect(backend.getToken()).resolves.toBe('current-gitlab-token');
    });

    it('bitbucket: returns refreshedTokenPromise when one is in flight, not the stale token', async () => {
      const backend = instantiate(Bitbucket);
      backend.token = 'stale-bitbucket-token';
      backend.refreshedTokenPromise = Promise.resolve('refreshed-bitbucket-token');

      await expect(backend.getToken()).resolves.toBe('refreshed-bitbucket-token');
    });

    it('bitbucket: falls back to this.token when no refresh is in flight', async () => {
      const backend = instantiate(Bitbucket);
      backend.token = 'current-bitbucket-token';
      backend.refreshedTokenPromise = undefined;

      await expect(backend.getToken()).resolves.toBe('current-bitbucket-token');
    });

    it('git-gateway: delegates entirely to tokenPromise (the Identity widget refresh)', async () => {
      const backend = instantiate(GitGateway);
      backend.tokenPromise = async () => 'refreshed-via-identity-widget';

      await expect(backend.getToken()).resolves.toBe('refreshed-via-identity-widget');
    });
  });

  describe('git-gateway: real authenticate() decides the tokenPromise per auth mode (DCMS-2220)', () => {
    it('OAuth credentials (no jwt): authenticate() assigns a static, non-refreshing accessor', async () => {
      const backend = instantiate(GitGateway);

      // authenticate() synchronously picks the tokenPromise branch (jwt vs.
      // OAuth) before it goes on to do async, network-dependent setup (fetch
      // gateway settings, resolve backendType, ...). That async tail has no
      // real gateway to talk to here and is expected to reject; only the
      // synchronous branch choice, and getToken()'s use of it, is under test.
      backend.authenticate({ token: 'stale-oauth-token' } as never).catch(() => {});

      await expect(backend.getToken()).resolves.toBe('stale-oauth-token');
    });
  });
});

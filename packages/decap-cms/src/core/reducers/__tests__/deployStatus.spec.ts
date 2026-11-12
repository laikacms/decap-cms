import { describe, expect, it } from 'vitest';

import deployStatus, {
  deployHistoryFailed,
  deployHistoryLoaded,
  deployHistoryRequested,
  deployStatusReset,
  deployStatusUpdated,
  onSiteBranch,
  selectDeployStatusVisible,
} from '@/core/reducers/deployStatus';

import type { Deployment } from '@/lib/backend/index';

function row(overrides: Partial<Deployment> = {}): Deployment {
  return {
    commit_sha: 'abc1234',
    source: 'webhook',
    external_id: 'deploy-1',
    provider_label: 'Netlify',
    state: 'success',
    target_url: 'https://example.com',
    error_message: null,
    finished_at: '2026-09-02T10:00:00.000Z',
    updated_at: '2026-09-02T10:00:00.000Z',
    ...overrides,
  };
}

describe('deployStatus reducer', () => {
  it('starts hidden', () => {
    const state = deployStatus(undefined, { type: '@@init' });

    expect(state).toMatchObject({ supported: false, pageEnabled: false, pendingCount: 0 });
    expect(selectDeployStatusVisible(state)).toBe(false);
  });

  it('tracks pending saves and the latest deploy', () => {
    const state = deployStatus(
      undefined,
      deployStatusUpdated({ pendingCount: 2, latest: row(), supported: true, pageEnabled: true }),
    );

    expect(state.pendingCount).toBe(2);
    expect(state.latest).toMatchObject({ commit_sha: 'abc1234' });
    expect(selectDeployStatusVisible(state)).toBe(true);
  });

  // The poll's window is bounded by the oldest pending save, so an older
  // deploy legitimately falls out of it. Forgetting it would blank the indicator.
  it('does not erase a known deploy when an update carries none', () => {
    const withDeploy = deployStatus(
      undefined,
      deployStatusUpdated({ pendingCount: 0, latest: row(), supported: true, pageEnabled: true }),
    );

    const after = deployStatus(withDeploy, deployStatusUpdated({ pendingCount: 1, latest: null }));

    expect(after.latest).toMatchObject({ commit_sha: 'abc1234' });
    expect(after.pendingCount).toBe(1);
  });

  it('stays hidden while the backend supports it but nothing has deployed', () => {
    // Auto-hide: a site whose host reports nothing must look like a CMS
    // without the feature, not one with a permanently empty page.
    const state = deployStatus(
      undefined,
      deployStatusUpdated({ pendingCount: 0, latest: null, supported: true, pageEnabled: true }),
    );

    expect(selectDeployStatusVisible(state)).toBe(false);
  });

  it('appears as soon as a save is outstanding, before any deploy is known', () => {
    const state = deployStatus(
      undefined,
      deployStatusUpdated({ pendingCount: 1, latest: null, supported: true, pageEnabled: true }),
    );

    expect(selectDeployStatusVisible(state)).toBe(true);
  });

  it('stays hidden when the page is configured off', () => {
    const state = deployStatus(
      undefined,
      deployStatusUpdated({ pendingCount: 1, latest: row(), supported: true, pageEnabled: false }),
    );

    expect(selectDeployStatusVisible(state)).toBe(false);
  });

  it('records history and takes the newest row as latest', () => {
    const state = deployStatus(
      undefined,
      deployHistoryLoaded({
        deployments: [row({ commit_sha: 'newest' }), row({ commit_sha: 'older' })],
        commits: [],
      }),
    );

    expect(state.deployments).toHaveLength(2);
    expect(state.latest).toMatchObject({ commit_sha: 'newest' });
    expect(state.loaded).toBe(true);
    expect(state.isFetching).toBe(false);
  });

  it('clears a previous error when a new read starts', () => {
    const failed = deployStatus(undefined, deployHistoryFailed({ error: 'boom' }));
    expect(failed.error).toBe('boom');

    expect(deployStatus(failed, deployHistoryRequested())).toMatchObject({ isFetching: true, error: null });
  });

  it('indexes entry labels by commit, skipping commits that have none', () => {
    const state = deployStatus(
      undefined,
      deployHistoryLoaded({
        deployments: [row()],
        commits: [
          { commit_sha: 'aaa', entry_label: 'Spring menu' },
          // A media-only save or a bulk delete: a bare sha beats a wrong name.
          { commit_sha: 'bbb', entry_label: null },
        ],
      }),
    );

    expect(state.entryLabels).toEqual({ aaa: 'Spring menu' });
  });

  it('replaces the label index rather than accumulating stale entries', () => {
    const first = deployStatus(
      undefined,
      deployHistoryLoaded({ deployments: [], commits: [{ commit_sha: 'aaa', entry_label: 'Old' }] }),
    );

    const second = deployStatus(
      first,
      deployHistoryLoaded({ deployments: [], commits: [{ commit_sha: 'bbb', entry_label: 'New' }] }),
    );

    expect(second.entryLabels).toEqual({ bbb: 'New' });
  });

  // An empty list after a failure means "we do not know", not "this site has
  // never deployed", and the page says different things for the two.
  it('leaves `loaded` false after a failure', () => {
    const state = deployStatus(undefined, deployHistoryFailed({ error: 'offline' }));

    expect(state.loaded).toBe(false);
    expect(state.deployments).toEqual([]);
  });

  it('returns to the hidden default on reset, e.g. at logout', () => {
    const shown = deployStatus(
      undefined,
      deployStatusUpdated({ pendingCount: 1, latest: row(), supported: true, pageEnabled: true }),
    );
    expect(selectDeployStatusVisible(shown)).toBe(true);

    const reset = deployStatus(shown, deployStatusReset());
    expect(reset).toMatchObject({ supported: false, pendingCount: 0, latest: null });
    expect(selectDeployStatusVisible(reset)).toBe(false);
  });
});

describe('deployStatus reducer, branch scoping', () => {
  function withBranch(branch: string | null) {
    return deployStatus(
      undefined,
      deployStatusUpdated({ pendingCount: 0, latest: null, supported: true, pageEnabled: true, branch }),
    );
  }

  // The history read is deliberately unscoped, so the page can show which
  // branch each deploy went to. `latest` is what says "the site is live",
  // and a branch deploy of an unpublished entry is not the site.
  it('takes the latest from the site branch, not from the newest row', () => {
    const state = deployStatus(
      withBranch('turbo'),
      deployHistoryLoaded({
        deployments: [
          row({ external_id: 'workflow', branch: 'cms/posts/x' }),
          row({ external_id: 'site', branch: 'turbo' }),
        ],
        commits: [],
      }),
    );

    expect(state.latest).toMatchObject({ external_id: 'site' });
    // The table still gets everything.
    expect(state.deployments).toHaveLength(2);
  });

  it('keeps a row that names no branch', () => {
    const state = deployStatus(
      withBranch('turbo'),
      deployHistoryLoaded({ deployments: [row({ external_id: 'nameless', branch: null })], commits: [] }),
    );

    expect(state.latest).toMatchObject({ external_id: 'nameless' });
  });

  it('scopes nothing when the backend cannot name the branch', () => {
    const state = deployStatus(
      withBranch(null),
      deployHistoryLoaded({ deployments: [row({ external_id: 'whatever', branch: 'cms/posts/x' })], commits: [] }),
    );

    expect(state.latest).toMatchObject({ external_id: 'whatever' });
  });

  // Branch scoping must not hide the page from a site whose host only ever
  // reports branch deploys: that site has real deploy information, and this
  // page is where someone goes to find out why nothing is live.
  it('stays visible when there are deploys but none on the site branch', () => {
    const state = deployStatus(
      withBranch('turbo'),
      deployHistoryLoaded({ deployments: [row({ branch: 'cms/posts/x' })], commits: [] }),
    );

    expect(state.latest).toBeNull();
    expect(selectDeployStatusVisible(state)).toBe(true);
  });

  it('onSiteBranch keeps the site branch and branchless rows only', () => {
    const rows = [row({ branch: 'main' }), row({ branch: 'cms/posts/x' }), row({ branch: null })];
    expect(onSiteBranch(rows, 'main').map(r => r.branch)).toEqual(['main', null]);
    expect(onSiteBranch(rows, null)).toBe(rows);
  });
});

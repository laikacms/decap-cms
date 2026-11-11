import { describe, expect, it } from 'vitest';

import {
  DEPLOY_STATE_COLORS,
  deployIndicator,
  isStaleDeploy,
  STALE_AFTER_MS,
} from '@/core/components/Deploys/deployStatusIndicator';

import type { Deployment } from '@/lib/backend/index';

const NOW = Date.parse('2026-09-02T12:00:00.000Z');

function row(overrides: Partial<Deployment> = {}): Deployment {
  return {
    commit_sha: 'abc',
    source: 'webhook',
    external_id: 'd1',
    provider_label: null,
    target_url: null,
    error_message: null,
    state: 'success',
    finished_at: '2026-09-02T10:00:00.000Z',
    updated_at: '2026-09-02T10:00:00.000Z',
    ...overrides,
  };
}

describe('deployIndicator', () => {
  it('shows publishing ahead of everything else', () => {
    expect(deployIndicator(1, row(), NOW).key).toBe('app.header.deploysPublishing');
  });

  it('names a failed build', () => {
    expect(deployIndicator(0, row({ state: 'failed' }), NOW).key).toBe('app.header.deploysFailed');
  });

  // A green dot beside the word "Deploys" leaves the reader to work out what
  // green means.
  it('names the state when the site is live', () => {
    expect(deployIndicator(0, row(), NOW).key).toBe('app.header.deploysDeployed');
  });

  it('is plain only when nothing is known yet', () => {
    expect(deployIndicator(0, null, NOW).key).toBe('app.header.deploys');
  });

  // The site is still serving the last successful deploy, and a superseded
  // build has lost nothing: its change ships inside the newer one.
  it('counts a superseded deploy as deployed', () => {
    expect(deployIndicator(0, row({ state: 'canceled' }), NOW).key).toBe(
      'app.header.deploysDeployed',
    );
  });

  // The pill is the surface an editor watches while they wait, so it is the
  // one place where "Building" for ever costs them the most.
  it('does not let the pill promise a build that ended', () => {
    const building = { state: 'building' as const, finished_at: null };

    expect(
      deployIndicator(0, row({ ...building, updated_at: '2026-09-02T11:00:00.000Z' }), NOW).key,
    ).toBe('app.header.deploys');
    expect(
      deployIndicator(0, row({ ...building, updated_at: '2026-09-02T11:59:00.000Z' }), NOW).key,
    ).toBe('app.header.deploysBuilding');
  });
});

describe('isStaleDeploy', () => {
  it('only ever applies to an unfinished deploy', () => {
    const old = new Date(NOW - STALE_AFTER_MS - 1000).toISOString();
    expect(isStaleDeploy(row({ state: 'failed', updated_at: old }), NOW)).toBe(false);
    expect(isStaleDeploy(row({ state: 'pending', updated_at: old }), NOW)).toBe(true);
    expect(isStaleDeploy(null, NOW)).toBe(false);
  });

  it('colours each state, publishing like building', () => {
    expect(deployIndicator(1, null, NOW).color).toBe(DEPLOY_STATE_COLORS.building);
    expect(deployIndicator(0, row({ state: 'failed' }), NOW).color).toBe(DEPLOY_STATE_COLORS.failed);
  });
});

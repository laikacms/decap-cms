import { colors } from '@/ui/default/index';
import { DEPLOY_STATE_COLORS, isStaleDeploy } from './deployStatusIndicator';

import type { Deployment } from '@/lib/backend/index';

/** Pure helpers behind the Deploys page, kept out of the component so they are tested without rendering. */

export function formatTime(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export interface Summary {
  key: string;
  options: Record<string, unknown>;
}

/**
 * The one sentence the page exists to say; publishing wins over everything.
 * `latest` is already scoped to the site's own branch by the reducer.
 */
export function summaryFor(pendingCount: number, latest: Deployment | null, now: number): Summary {
  if (pendingCount > 0) {
    return { key: 'ui.deploys.summaryPublishing', options: { smart_count: pendingCount } };
  }
  if (!latest || isStaleDeploy(latest, now)) {
    return { key: 'ui.deploys.summaryUnknown', options: {} };
  }
  if (latest.state === 'failed') {
    return { key: 'ui.deploys.summaryFailed', options: {} };
  }
  if (latest.state === 'building' || latest.state === 'pending') {
    return { key: 'ui.deploys.summaryBuilding', options: {} };
  }
  if (latest.state === 'success') {
    return {
      key: 'ui.deploys.summaryLive',
      options: { time: formatTime(latest.finished_at || latest.updated_at) },
    };
  }
  return { key: 'ui.deploys.summaryUnknown', options: {} };
}

/**
 * Who REPORTED the deploy, not necessarily who ran it. Without a host label the
 * source still names the git forge, which beats an unhelpful "Git provider".
 */
export function targetOf(row: Deployment) {
  if (row.provider_label) {
    return row.provider_label;
  }
  if (row.source?.startsWith('github')) {
    return 'GitHub';
  }
  if (row.source?.startsWith('gitlab')) {
    return 'GitLab';
  }
  return 'Webhook';
}

export function rowId(row: Deployment) {
  return `${row.source}:${row.external_id}`;
}

export function branchOf(row: Deployment) {
  return row.branch || '';
}

/**
 * The deploy each branch is currently serving: per branch, because every
 * `cms/...` branch has its own URL. Rows arrive newest-first, so the first
 * success per branch is the live one. The summary and the header indicator
 * stay scoped to the site's own branch; this does not feed them.
 */
export function liveDeployIds(deployments: Deployment[]) {
  const seen = new Set<string>();
  const live = new Set<string>();
  for (const row of deployments) {
    if (row.state !== 'success') continue;
    const branch = branchOf(row);
    if (seen.has(branch)) continue;
    seen.add(branch);
    live.add(rowId(row));
  }
  return live;
}

/**
 * `stalled` is ours rather than the host's: a build nobody has mentioned in a
 * long while has not failed as far as we know, but "Building" promises activity.
 */
export function stateKeyFor(row: Deployment, liveIds: Set<string>, now: number) {
  if (isStaleDeploy(row, now)) {
    return 'ui.deploys.state.stalled';
  }
  if (row.state === 'success') {
    return liveIds.has(rowId(row)) ? 'ui.deploys.state.live' : 'ui.deploys.state.deployed';
  }
  return `ui.deploys.state.${row.state}`;
}

export function stateColorFor(row: Deployment, now: number) {
  if (isStaleDeploy(row, now)) {
    return DEPLOY_STATE_COLORS.stalled as string;
  }
  return DEPLOY_STATE_COLORS[row.state] || colors.text;
}

/**
 * The branch says which content, the environment which destination; Netlify
 * builds one ref as production, branch deploy and Deploy Preview alike, so
 * both are shown, but only when they differ ("main · main" is noise).
 */
export function whereOf(row: Deployment) {
  const branch = row.branch || null;
  const environment = row.environment || null;

  if (branch && environment && environment !== branch) {
    return `${branch} · ${environment}`;
  }
  return branch || environment || '-';
}

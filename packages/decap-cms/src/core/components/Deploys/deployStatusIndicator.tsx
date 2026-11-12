import { css } from '@emotion/react';
import React from 'react';

import { colorsRaw, Icon } from '@/ui/default/index';

import type { Deployment } from '@/lib/backend/index';

/**
 * The header's deploy indicator: state between the save toast and the "live"
 * one needs a place that is not an interruption. It is the nav item itself,
 * not a badge beside it, so there are not two doors to the same page.
 */

/**
 * The `circle` icon rather than a styled span, so it lines up with the other
 * nav icons. Its colour is the state: a container that recolours its icons
 * should skip `.deploy-status-dot`, as the header does.
 */
export function StatusDot({ color }: { color: string }) {
  return (
    <Icon
      type="circle"
      className="deploy-status-dot"
      css={css`
        color: ${color};
        flex-shrink: 0;
      `}
    />
  );
}

/** Yellow is a pale background tint, invisible as a dot, so in-progress uses brown. */
export const DEPLOY_STATE_COLORS: Record<string, string> = {
  success: colorsRaw.green,
  failed: colorsRaw.redDark,
  building: colorsRaw.brown,
  pending: colorsRaw.brown,
  canceled: colorsRaw.gray,
  // Not a host state: a build that stopped being mentioned, so no outcome.
  stalled: colorsRaw.gray,
};

/**
 * How long an unfinished deploy may go unmentioned before we stop calling it
 * "building": a deleted branch's preview is never reported again. Generous, so
 * it never overtakes a slow but healthy build.
 */
export const STALE_AFTER_MS = 30 * 60 * 1000;

/**
 * Whether an unfinished deploy has gone quiet too long to call it "building".
 * Presentation only: going quiet is not the same claim as failing.
 */
export function isStaleDeploy(row: Deployment | null | undefined, now = Date.now()) {
  if (!row || (row.state !== 'building' && row.state !== 'pending')) {
    return false;
  }
  const at = Date.parse(row.updated_at);
  return Number.isFinite(at) && now - at > STALE_AFTER_MS;
}

export interface DeployIndicator {
  /** The nav item's label, a translation key under `app.header`. */
  key: string;
  color: string;
}

/**
 * What the nav item says and what colour its dot is. Publishing beats
 * everything: an editor with a save in flight is asking about that save.
 */
export function deployIndicator(pendingCount: number, latest: Deployment | null, now = Date.now()): DeployIndicator {
  if (pendingCount > 0) {
    return { key: 'app.header.deploysPublishing', color: DEPLOY_STATE_COLORS.building };
  }
  // A stale build must not say "Building" forever: waiting will not help.
  if (!latest || isStaleDeploy(latest, now)) {
    return { key: 'app.header.deploys', color: colorsRaw.gray };
  }
  if (latest.state === 'failed') {
    return { key: 'app.header.deploysFailed', color: DEPLOY_STATE_COLORS.failed };
  }
  if (latest.state === 'building' || latest.state === 'pending') {
    return { key: 'app.header.deploysBuilding', color: DEPLOY_STATE_COLORS.building };
  }
  // `canceled` counts as deployed: the site still serves the last success, and
  // a superseded build's change ships inside the newer one.
  return { key: 'app.header.deploysDeployed', color: DEPLOY_STATE_COLORS.success };
}

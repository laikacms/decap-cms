import { createSlice } from '@reduxjs/toolkit';

import type { DeployCommit, Deployment } from '@/lib/backend/index';
import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Deploy status: the header indicator and the Deploys page. Distinct from the
 * older `deploys` slice, which holds deploy PREVIEW links for unpublished
 * entries. Filled only by a backend that implements the deploy-status methods
 * (see `@/lib/backend/deployStatus`); for every other backend it stays at its
 * default and every surface stays hidden.
 */
export type DeployStatusState = {
  /** Saves this browser has made that no deploy has accounted for yet. */
  pendingCount: number,
  /** Most recent deploy of the site's own branch, in any state. Null until one is read. */
  latest: Deployment | null,
  /** History, newest first, across branches. */
  deployments: Deployment[],
  /** The branch the site publishes from; null makes every row a candidate for "Live". */
  branch: string | null,
  /** What each commit saved, keyed by sha, across editors. */
  entryLabels: Record<string, string>,
  isFetching: boolean,
  error: string | null,
  /** Whether the backend reports deploys at all; false keeps every surface hidden. */
  supported: boolean,
  /** Whether the Deploys page and its nav item are configured on. */
  pageEnabled: boolean,
  /** True once a history read has completed, so an empty list can be trusted. */
  loaded: boolean,
};

export const initialDeployStatusState: DeployStatusState = {
  pendingCount: 0,
  latest: null,
  deployments: [],
  branch: null,
  entryLabels: {},
  isFetching: false,
  error: null,
  supported: false,
  pageEnabled: false,
  loaded: false,
};

export interface DeployStatusUpdatePayload {
  pendingCount: number;
  latest: Deployment | null;
  supported?: boolean | undefined;
  pageEnabled?: boolean | undefined;
  /** The branch the site publishes from; null when the backend cannot say. */
  branch?: string | null | undefined;
}

/**
 * The rows that describe the site itself. A row naming no branch is kept,
 * since some hosts report none and refusing those would leave such a site
 * unable to say anything about itself.
 */
export function onSiteBranch(deployments: Deployment[], branch: string | null) {
  if (!branch) {
    return deployments;
  }
  return deployments.filter(row => !row.branch || row.branch === branch);
}

const deployStatusSlice = createSlice({
  name: 'deployStatus',
  initialState: initialDeployStatusState,
  reducers: {
    deployStatusUpdated(state, action: PayloadAction<DeployStatusUpdatePayload>) {
      const { pendingCount, latest, supported, pageEnabled, branch } = action.payload;
      state.pendingCount = pendingCount;
      if (branch !== undefined) {
        state.branch = branch;
      }
      // An empty poll must not erase what we knew: its window is bounded.
      if (latest) {
        state.latest = latest;
      }
      if (supported !== undefined) {
        state.supported = supported;
      }
      if (pageEnabled !== undefined) {
        state.pageEnabled = pageEnabled;
      }
    },
    deployHistoryRequested(state) {
      state.isFetching = true;
      state.error = null;
    },
    deployHistoryLoaded(state, action: PayloadAction<{ deployments: Deployment[], commits: DeployCommit[] }>) {
      state.isFetching = false;
      state.loaded = true;
      state.deployments = action.payload.deployments;
      // The history is unscoped; `latest` is the state of the site, which a
      // branch deploy of an unpublished entry is not.
      state.latest = onSiteBranch(action.payload.deployments, state.branch)[0] ?? state.latest;
      state.entryLabels = {};
      for (const commit of action.payload.commits ?? []) {
        if (commit.entry_label) {
          state.entryLabels[commit.commit_sha] = commit.entry_label;
        }
      }
    },
    deployHistoryFailed(state, action: PayloadAction<{ error: string }>) {
      state.isFetching = false;
      // `loaded` stays false: after a failure an empty list means "unknown".
      state.error = action.payload.error;
    },
    /** Logout: the next user may be on a site, or a backend, with none of this. */
    deployStatusReset() {
      return initialDeployStatusState;
    },
  },
});

export const {
  deployStatusUpdated,
  deployHistoryRequested,
  deployHistoryLoaded,
  deployHistoryFailed,
  deployStatusReset,
} = deployStatusSlice.actions;

/**
 * Auto-hide: the nav item and the page exist only once this site has
 * produced deploy information, so a silent host looks like a CMS without the
 * feature.
 */
export function selectDeployStatusVisible(state: DeployStatusState) {
  return (
    state.supported
    && state.pageEnabled
    // `deployments` too: `latest` is branch-scoped, and a host that only
    // reports branch deploys still has a page worth showing.
    && (state.latest !== null || state.deployments.length > 0 || state.pendingCount > 0)
  );
}

export default deployStatusSlice.reducer;

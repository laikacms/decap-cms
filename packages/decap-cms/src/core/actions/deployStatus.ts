import { currentBackend } from '@/core/backend';
import {
  deployHistoryFailed,
  deployHistoryLoaded,
  deployHistoryRequested,
  deployStatusReset,
  deployStatusUpdated,
} from '@/core/reducers/deployStatus';
import { randomUUID } from '@/lib/util/index';
import { addNotification, updateNotification } from './notifications';

import type { DeployResolution, DeployStatusImplementation } from '@/lib/backend/index';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { NotificationPayload } from './notifications';

/**
 * Post-save deploy notifications, the header indicator and the Deploys page's
 * reads. The watching belongs to the backend, so all of it is duck-typed: a
 * backend without the deploy-status methods keeps exactly the plain "Entry
 * saved" toast, and core imports no backend.
 */

type State = any;
type Dispatch = ThunkDispatch<State, {}, AnyAction>;

/** One subscription for the session, so a resolution reaches the editor anywhere. */
let unsubscribe: (() => void) | null = null;

/**
 * The save toast on screen, if any: a deploy quick enough to beat it updates
 * it in place instead of stacking a second one.
 */
let saveNotificationId: string | null = null;

/** Behind the header indicator; it never causes a poll, so it may outlive `unsubscribe`. */
let unsubscribeStatus: (() => void) | null = null;

function backendFor(getState: () => State): DeployStatusImplementation | null {
  try {
    return currentBackend(getState().config).implementation ?? null;
  } catch {
    // Called before the config resolves, or by a backend that cannot be
    // constructed yet. There is nothing to subscribe to either way.
    return null;
  }
}

/**
 * Starts listening for deploy outcomes. Subscribing is also what makes the
 * backend resume its ledger of unpublished saves after a reload. Idempotent.
 */
export function startDeployNotifications() {
  return (dispatch: Dispatch, getState: () => State) => {
    if (unsubscribe) {
      return;
    }
    const implementation = backendFor(getState);
    if (typeof implementation?.subscribeDeployResolutions !== 'function') {
      return;
    }
    unsubscribe =
      implementation.subscribeDeployResolutions(resolution => dispatch(announceDeployResolution(resolution))) ?? null;
  };
}

/**
 * Tears both subscriptions down. Called on logout: they are module-level, so
 * leaving them set would make the next sign-in's `start*` early-return while
 * the surviving closures still point at the backend's discarded watcher.
 */
export function stopDeployNotifications() {
  unsubscribe?.();
  unsubscribe = null;
  unsubscribeStatus?.();
  unsubscribeStatus = null;
  saveNotificationId = null;
}

/** Logout: drop the subscriptions and forget what the previous session knew. */
export function resetDeployStatus() {
  return (dispatch: (action: AnyAction) => unknown) => {
    stopDeployNotifications();
    dispatch(deployStatusReset());
  };
}

/**
 * Wires the header indicator, and takes the ONE read this feature makes on
 * startup; after that only the backend's watcher polls, and only while a save
 * is outstanding. Idempotent.
 */
export function startDeployStatus() {
  return (dispatch: Dispatch, getState: () => State) => {
    if (unsubscribeStatus) {
      return;
    }

    const implementation = backendFor(getState);
    if (typeof implementation?.subscribeDeployStatus !== 'function') {
      return;
    }

    const config = implementation.deployStatusConfig?.() ?? {
      enabled: true,
      page: true,
      primaryTarget: null,
    };

    if (!config.enabled) {
      return;
    }

    unsubscribeStatus = implementation.subscribeDeployStatus(status =>
      dispatch(
        deployStatusUpdated({
          pendingCount: status.pendingCount,
          latest: status.latest,
          supported: true,
          pageEnabled: config.page,
          // Which branch is the site, so the page calls the right deploy "Live".
          branch: config.branch ?? null,
        }),
      )
    ) ?? null;

    if (unsubscribeStatus) {
      void dispatch(loadDeployHistory());
    }
  };
}

/** Reads the site's recent deploys: at startup, and from the Deploys page. */
export function loadDeployHistory({ silent = false }: { silent?: boolean } = {}) {
  return async (dispatch: Dispatch, getState: () => State) => {
    const implementation = backendFor(getState);
    if (typeof implementation?.listDeployments !== 'function') {
      return;
    }

    // `silent`: the Deploys page's background refresh must not flip the button.
    if (!silent) {
      dispatch(deployHistoryRequested());
    }

    try {
      // Together: a deploy with no entry name is the bare sha this read replaces.
      const [deployments, commits] = await Promise.all([
        implementation.listDeployments(),
        implementation.listCommits?.() ?? Promise.resolve([]),
      ]);
      dispatch(deployHistoryLoaded({ deployments, commits }));
    } catch (error) {
      dispatch(deployHistoryFailed({ error: error instanceof Error ? error.message : String(error) }));
    }
  };
}

/**
 * Where a commit can be read by a human, or null when the backend cannot say.
 * Derived rather than stored: it depends only on the backend.
 */
export function selectCommitUrl(state: State, sha: string): string | null {
  const implementation = backendFor(() => state);
  if (typeof implementation?.commitUrl !== 'function') {
    return null;
  }
  try {
    return implementation.commitUrl(sha);
  } catch {
    return null;
  }
}

/**
 * Announces a completed save, and asks the backend to watch for the deploy
 * that carries it. Without a backend that can, this is exactly the plain
 * "Entry saved" toast. Editorial workflow keeps it too: the backend declines
 * to watch a commit that did not land on the site's branch.
 */
export function notifyEntrySaved(entryLabel?: string, entryUrlPath?: string) {
  return (dispatch: Dispatch, getState: () => State) => {
    const implementation = backendFor(getState);

    // Idempotent, and here as well as at startup so a backend that becomes
    // available later still gets subscribed.
    dispatch(startDeployNotifications());

    let watching = false;
    if (typeof implementation?.recordSaveForDeployWatch === 'function') {
      try {
        watching = implementation.recordSaveForDeployWatch(entryLabel, entryUrlPath);
      } catch (error) {
        // The entry is committed; a watch that cannot start costs only the follow-up.
        console.warn('Could not watch the deploy for this save', error);
      }
    }

    const id = randomUUID();
    saveNotificationId = watching ? id : null;

    dispatch(
      addNotification({
        id,
        // "Publishing" only where a deploy will actually be reported;
        // promising a follow-up that cannot come would be worse than silence.
        message: { key: watching ? 'ui.toast.entryPublishing' : 'ui.toast.entrySaved' },
        type: 'success',
        // Short either way. The editor is not made to watch a build.
        dismissAfter: 4000,
      }),
    );
  };
}

function announceDeployResolution(resolution: DeployResolution) {
  return (dispatch: Dispatch, getState: () => State) => {
    const state = getState();
    const entries = resolution.entries ?? [];
    const only = entries.length === 1 ? entries[0] : null;

    // The deploy's own URL is the live site, not the build log; `site_url` is
    // the fallback, and with neither no link is shown.
    const siteUrl = resolution.targetUrl || state.config?.site_url;

    // One named entry links to that entry; a grouped "3 changes are live" has
    // no single page to point at.
    const entryUrl = only?.entryUrlPath ? joinUrl(siteUrl, only.entryUrlPath) : null;

    const payload: Partial<NotificationPayload> = resolution.status === 'live'
      ? {
        // Named when it is one entry, counted when it is several: one
        // notification either way, never a stack of them.
        message: only
          ? { key: 'ui.toast.entryLive', entry: only.entryLabel || only.entryPath }
          : { key: 'ui.toast.entriesLive', count: entries.length },
        type: 'success',
        spinner: false,
        dismissAfter: 8000,
        link: entryUrl ? linkTo(entryUrl, 'ui.toast.viewEntry') : linkTo(siteUrl, 'ui.toast.viewSite'),
      }
      : {
        message: { key: 'ui.toast.entryDeployFailed' },
        type: 'error',
        spinner: false,
        // Held open: this is the one outcome the editor has to act on, and
        // the action is the link inside the toast. Dismissible by click.
        dismissAfter: false,
        link: linkTo(resolution.targetUrl, 'ui.toast.viewBuildLog'),
      };

    const saveToastStillUp = saveNotificationId !== null
      && (state.notifications?.notifications ?? []).some(
        (notification: { id: string }) => notification.id === saveNotificationId,
      );

    if (saveToastStillUp) {
      dispatch(updateNotification(saveNotificationId as string, payload));
      // Cleared, so a second resolution cannot overwrite this one in place.
      saveNotificationId = null;
      return;
    }

    dispatch(addNotification(payload as NotificationPayload));
  };
}

function linkTo(url: string | null | undefined, labelKey: string) {
  return url ? { url, label: { key: labelKey } } : undefined;
}

/** Joins a site URL to an entry path without doubling or dropping the slash. */
function joinUrl(base: string | null | undefined, path: string) {
  if (!base) {
    return null;
  }
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

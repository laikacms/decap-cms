/**
 * Deploy status: the optional seam a backend implements to tell editors when
 * a save is live on their site. Every method is optional and duck-typed by
 * core; a backend that implements none of them gets exactly the plain
 * "Entry saved" toast and no Deploys page or header indicator.
 */

/** A deploy's state, as the host reports it. */
export type DeployState = 'pending' | 'building' | 'success' | 'failed' | 'canceled';

/** A deploy as the backend reports it, narrowed to what core reads. */
export interface Deployment {
  commit_sha: string;
  /** The branch that was built: the site's, or an editorial-workflow one. */
  branch?: string | null;
  /** Who reported it, e.g. `github_deployment`, `netlify_webhook`. */
  source: string;
  external_id: string;
  /** The host's name, when known; null makes the page fall back to the source. */
  provider_label: string | null;
  state: DeployState;
  /** The live site on success, the build log on failure. */
  target_url: string | null;
  error_message: string | null;
  /** Where it published to, in the host's words ("production", "deploy-preview"). */
  environment?: string | null;
  finished_at: string | null;
  updated_at: string;
}

/** One CMS save, narrowed to what core reads: which entry a commit carried. */
export interface DeployCommit {
  commit_sha: string;
  entry_label: string | null;
}

/** An event: a deploy accounted for one or more of this editor's saves. */
export interface DeployResolution {
  /** `live`: a deploy containing the change succeeded. `failed`: one containing it failed. */
  status: 'live' | 'failed';
  entries: Array<{ entryPath: string, entryLabel?: string | undefined, entryUrlPath?: string | undefined }>;
  targetUrl: string | null;
}

/** A condition: what the header indicator renders between events. */
export interface DeployWatchStatus {
  /** Saves this browser has made that no deploy has accounted for yet. */
  pendingCount: number;
  /** The most recent deploy of the site's own branch, in any state. */
  latest: Deployment | null;
}

/** Which surfaces are on, and the branch whose deploys are "the site". */
export interface DeployStatusConfig {
  enabled: boolean;
  /** The "your change is live" notifications. */
  notifications?: boolean;
  /** The Deploys page and its header nav item. */
  page: boolean;
  /** The host whose success counts as live on a site published to several. */
  primaryTarget: string | null;
  /** The branch the site publishes from; null when the backend cannot say. */
  branch?: string | null;
}

/** The deploy-status methods a backend implementation may define. */
export interface DeployStatusImplementation {
  /**
   * Subscribes to deploy outcomes for the session; subscribing also resumes
   * any saves still waiting from before a reload. Null: none will arrive.
   */
  subscribeDeployResolutions?: (listener: (resolution: DeployResolution) => void) => (() => void) | null;
  /**
   * Starts watching for the deploy that carries the save just made. False
   * when it cannot (no commit to watch, nothing to read deploys from).
   */
  recordSaveForDeployWatch?: (entryLabel?: string, entryUrlPath?: string) => boolean;
  /**
   * The header indicator's channel. Must never start a poll: an idle CMS
   * would otherwise poll forever to keep a badge current.
   */
  subscribeDeployStatus?: (listener: (status: DeployWatchStatus) => void) => (() => void) | null;
  /** The site's recent deploys, newest first, across branches. */
  listDeployments?: () => Promise<Deployment[]>;
  /** Recent CMS saves, so a deploy can be named by its entry rather than a sha. */
  listCommits?: () => Promise<DeployCommit[]>;
  /** Where a human can read a commit, or null. */
  commitUrl?: (sha: string) => string | null;
  deployStatusConfig?: () => DeployStatusConfig;
}

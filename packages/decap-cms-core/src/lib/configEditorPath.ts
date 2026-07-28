import trimStart from 'lodash/trimStart';

/**
 * Best-effort mapping from the URL the CMS fetches `config.yml` from (see
 * `getConfigUrl` in `actions/config.ts`) to the repo-relative path the
 * backend should read/write when committing edits made in the in-CMS config
 * editor (DCMS-1418).
 *
 * `config.yml` is loaded over HTTP from wherever the built admin page is
 * served, not through the backend's git API, so there is no guaranteed
 * mapping back to a repo path: a static site generator's public root can sit
 * below the repo root (e.g. `public/admin/config.yml` served at
 * `/admin/config.yml`). This assumes the common case where the admin folder
 * is not nested under an extra public-root prefix, i.e. the URL path equals
 * the repo path. Sites that violate this assumption will see the config
 * editor read/write the wrong file and should avoid it until the mapping is
 * made configurable.
 */
export function resolveConfigFilePath(configUrl: string): string {
  try {
    const base = typeof window !== 'undefined' ? window.location.href : undefined;
    const url = new URL(configUrl, base);
    return trimStart(url.pathname, '/');
  } catch {
    return trimStart(configUrl, '/');
  }
}

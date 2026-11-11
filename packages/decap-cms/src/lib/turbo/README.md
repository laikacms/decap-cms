# lib/turbo

Code the two Decap Turbo backends ([`backends/turbo-github`](../../backends/turbo-github) and
[`backends/turbo-gitlab`](../../backends/turbo-gitlab)) share, published as `decap-cms/lib/turbo`.
Ported from upstream Decap CMS's `decap-cms-lib-turbo`; see the turbo-github README for how the
pieces fit together.

| Module                                           | What it does                                                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `session.ts`                                     | The Supabase session: restore, begin (pins the JWT to the site), refresh with retries and a cooldown, permissions, the proxy's terminal answers. |
| `sessionSync.ts`                                 | Keeps single-use refresh tokens usable from every tab: a Web Lock around refreshes, token claims, server-side revoke on logout.                  |
| `scopedFetch.ts`                                 | The fetch for Turbo's own routes: bearer token, `x-site-id`/`site_id` scoping, one forced refresh on a proxy 401.                                |
| `requestCoalescer.ts`                            | Joins identical in-flight GET requests.                                                                                                          |
| `supabase.ts`, `contentCache.ts`                 | Read side of Turbo's content cache: `_content/sync`, PostgREST reads, the freshness check before trusting a cached entry.                        |
| `preloadConfig.ts`                               | The backends' static `preloadConfig`: fetches the site's repo, keys and default branch from the control plane.                                   |
| `AuthenticationPage.tsx`                         | "Login with Turbo": the popup (origin-checked `postMessage`) and the one-time exchange link.                                                     |
| `commitAuthor.ts`, `noteIdentity.ts`             | Who the signed-in editor is, for commits and notes.                                                                                              |
| `telemetry.ts`, `saveEvent.ts`, `saveMetrics.ts` | Fire-and-forget usage events (`cms_session_started`, `cms_entry_saved`) to Turbo's `telemetry` function, and the save measurements they carry.   |
| `editorBridge.ts`, `editorAttach.ts`             | Experimental, opt-in (`editor_bridge: true`): syncs the open entry with Turbo so an agent can propose field changes; "Ask Claude" field action.  |

It never imports `core`: it builds on `lib/util`, `lib/backend` and `ui/default`, and gets the
editor API through the `attachEditor` call core makes on a backend.

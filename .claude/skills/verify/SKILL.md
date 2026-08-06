---
name: verify
description: Build, launch, and drive the Decap CMS demo app to verify changes end-to-end in a real browser. Use after changing widgets, core UI, or app behavior.
---

# Verify changes in the demo app

## Build + serve

```bash
pnpm build:demo                                  # bundles src → packages/decap-cms/dev-test/dist/decap-cms.js (~1s, rolldown-vite)
npx --yes serve packages/decap-cms/dev-test -l 5174   # run in background (from the repo root)
```

Demo: http://localhost:5174 — test-repo backend (in-memory, fixtures from
`repo-fixtures.js`), login is a single "Login" button, no credentials.
`dev-test/config.yml` defines collections; **Restaurants** has the widget
test surface: gallery (multi image), post (multi relation), authors (list).

## Driving it (agent-browser)

- **Always pass `--session <name>`** — the default session attaches to the
  user's live Chrome (real tabs, real logins). A named session is an
  isolated browser.
- The editor pane scrolls internally; below-the-fold buttons miss on
  coordinate clicks. Snapshot right before every ref click, or click via
  `eval` + DOM `.click()`.
- After a rebuild the browser serves the old bundle from cache (no
  cache-busting hash). Reload is not enough — close the session and open a
  fresh one.
- Entry drafts persist in `localStorage` (`decap-cms:backup.<collection>`)
  and resurrect on `/new`. `localStorage.clear()` before reload, from a
  page that isn't the editor (the editor re-saves its backup on unload).

## Drag-and-drop testing

The sortable widgets use react-dnd's HTML5 backend. `agent-browser drag`
(mouse events) does NOT trigger it. Dispatch real DragEvents via eval, in
**separate eval calls** (the backend publishes the source on a setTimeout
and hovers on requestAnimationFrame):

1. `dragstart` on the `[draggable=true]` element (keep the DataTransfer in
   a `window.` var across evals)
2. next eval: `dragenter` + `dragover` on the target item, with target
   clientX/Y
3. next eval: `drop` + `dragend` on the target
4. assert DOM order changed; check `window.__errs` from a
   `window.addEventListener('error', ...)` installed up front — widget
   handler exceptions don't reach `agent-browser console --errors`.

List items: `.SortableListItem` (handle is its `[draggable=true]` child).
Relation chips: `[draggable=true]` divs containing the option label.

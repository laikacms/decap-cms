---
'@laikacms/decap-cms': minor
---

Add `resolveLaikaBackend({ local, remote })` to `@laikacms/decap-cms/backends/laika`, which picks
the Decap `backend:` block for the current build: the local JSON:API that `@laikacms/vite-plugin`
mounts while `vite dev` runs, and the remote OAuth backend everywhere else. One admin config now
targets both without manual switching.

Selection reads `import.meta.env.DEV`, and fails safe to `remote` whenever that flag is not truthy,
so a production build, a standalone admin or `vite preview` never targets a phantom local endpoint.
Local mode therefore only engages when the admin config itself is bundled by Vite. Tests can pass
`dev` explicitly to exercise both branches.

`DEFAULT_LOCAL_BACKEND_BASE_PATH` (`/__laika`) and `DEFAULT_LOCAL_BACKEND_DEV_TOKEN` are exported
alongside it; `createLaikaBackend` and `DevAuthenticationPage` stay public, so hand-wiring a custom
local/remote arrangement instead of using the helper is still possible.

# dev-test demo

Reference demo served from this directory (`pnpm build:demo` / `pnpm build:dev-test`, then
`pnpm serve:dev-test` or any static server). `index.html` loads the built IIFE bundle
(`dist/decap-cms.js`) and calls `CMS.init()` against the fixtures in `config.yml` /
`backends/test/config.yml`.

## Map widget is opt-in (DCMS-1971)

The map widget isn't in the default `@laikacms/decap-cms` app bundle — `ol` (OpenLayers) is an
optional peer dependency, so the demo doesn't register it out of the box (see
`packages/decap-cms/src/widgets/map/README.md`). The Kitchen Sink collection's `map` field was
removed from `config.yml` and `backends/test/config.yml` for this reason (DCMS-2019): a
`widget: map` field with no registered control renders "No control for widget 'map'." and, if
required, permanently blocks Save.

To try the map widget in this demo yourself, register it before `CMS.init()` runs (see
`packages/decap-cms/src/widgets/map/README.md` for the `registerMapWidget()` API) and re-add the
field to the config(s) above.

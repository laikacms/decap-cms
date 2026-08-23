# dev-test demo

Reference demo served from this directory (`pnpm build:demo` / `pnpm build:dev-test`, then
`pnpm serve:dev-test` or any static server). `index.html` loads the built IIFE bundle
(`dist/decap-cms.js`) and calls `CMS.init()` against the fixtures in `config.yml` /
`backends/test/config.yml`.

## Map widget is opt-in (DCMS-1971)

The map widget isn't in the default `decap-cms` app bundle — it ships as the standalone
`decap-cms-widget-map` package (source at `extensions/widgets/map`), so the demo doesn't register it
out of the box. The Kitchen Sink collection's `map` field was removed from `config.yml` and
`backends/test/config.yml` for this reason (DCMS-2019): a `widget: map` field with no registered
control renders "No control for widget 'map'." and, if required, permanently blocks Save.

To try the map widget in this demo yourself, install `decap-cms-widget-map` and call
`CMS.registerWidget(DecapCmsWidgetMap.Widget())` before `CMS.init()` runs (see
`extensions/widgets/map/README.md`) and re-add the field to the config(s) above.

## Running the demo locally

```bash
cd packages/decap-cms
pnpm build:dev-test
npx http-server -c-1 dev-test -p 8080
```

Then open `http://localhost:8080/`.

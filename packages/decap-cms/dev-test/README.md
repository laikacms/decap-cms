# dev-test demo

Reference demo served from this directory (`pnpm build:demo` / `pnpm build:dev-test`, then
`pnpm serve:dev-test` or any static server). `index.html` loads the built IIFE bundle
(`dist/decap-cms.js`) and calls `CMS.init()` against the fixtures in `config.yml` /
`backends/test/config.yml`.

## Map widget is opt-in (DCMS-1971)

The map widget isn't in the default `@laikacms/decap-cms` app bundle — it ships as the standalone
`@laikacms/decap-cms-widget-map` package (source at `extensions/widgets/map`), so the demo doesn't
register it out of the box. The Kitchen Sink collection's `map` field was removed from
`config.yml` and `backends/test/config.yml` for this reason (DCMS-2019): a `widget: map` field
with no registered control renders "No control for widget 'map'." and, if required, permanently
blocks Save.

To try the map widget in this demo yourself, install `@laikacms/decap-cms-widget-map` and call
`CMS.registerWidget(DecapCmsWidgetMap.Widget())` before `CMS.init()` runs (see
`extensions/widgets/map/README.md`) and re-add the field to the config(s) above.

## `laika-test-runner.html` is a release gate (DCMS-2076)

`laika-test-runner.html` is the headless smoke-check for the laika-cms bundle: it boots
`/laika.html` in an iframe, drives it through the app's core flows, and prints a single
`RESULT: N passed, M failed` line at the bottom of `#results`.

Any `RESULT:` other than all-passed is a release blocker. Every failing check must be triaged
before shipping: fix the underlying regression, or — if a check itself is wrong (a stale
selector, a timing assumption that no longer holds, etc.) — fix the check and confirm the app
actually behaves as expected first. Do not let failures accumulate as "known noise"; a runner
with pre-existing red lines hides real regressions in the same area (see #2076, where 7 of 8
failing checks turned out to be stale selectors rather than bugs).

To run it locally:

```bash
cd packages/decap-cms
pnpm build:dev-test
npx http-server -c-1 dev-test -p 8080
```

Then open `http://localhost:8080/laika-test-runner.html` and wait ~30s for the `RESULT:` line.

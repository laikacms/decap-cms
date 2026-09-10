# Map widget

The map widget renders an interactive [OpenLayers](https://openlayers.org/) map for drawing a single
geometry (point, line, or polygon) and stores the result as a GeoJSON string.

It is bundled and registered by the default app entry (`src/app/extensions.ts`), as it was in v3, so
a `widget: 'map'` field works with no install and no registration call.

`ol` is an ordinary dependency of this package rather than an optional peer. DCMS-1971 briefly made
it optional and split the widget into `extensions/widgets/map`; that was reversed, because a widget
the default entry registers cannot honestly call its own dependency optional, and the split broke v3
configs at runtime in the editor rather than at build time.

## Stylesheet

OpenLayers ships its control styles as `ol/ol.css`. This package builds with plain `tsc` and has no
CSS imports anywhere in `src/`, so the stylesheet is vendored as a string in `olStyles.ts` and fed
through Emotion's `css` helper, which also scopes it to the widget's own element instead of
injecting it globally. `__tests__/olStyles.spec.ts` fails if the vendored copy drifts from the
installed `ol`; regenerate it rather than editing by hand.

## Config

```yaml
- { label: 'Location', name: 'location', widget: 'map', type: 'Point', decimals: 7 }
```

- `type` (optional, default `Point`) — the geometry the draw interaction produces. One of `Point`,
  `LineString`, or `Polygon` (`schema.ts`). Read in `withMapControl.tsx` as `field.type ?? 'Point'`
  and passed straight through to OpenLayers' `Draw` interaction.
- `decimals` (optional, default `7`) — the coordinate precision (number of decimal places) used when
  the drawn geometry is serialized back to GeoJSON. Read as `field.decimals ?? 7` and passed to
  `GeoJSON#writeGeometry` as `{ decimals }`.
- `default` (optional) — a GeoJSON string seed value for new entries. This isn't read by the map
  widget itself; like every other widget it's applied generically by `createEmptyDraftData`
  (`src/core/actions/entries.tsx`), which seeds a new entry's field value from `field.default` when
  present.

## Lazy mount / ResizeObserver lifecycle

Source: `withMapControl.tsx`.

The underlying OpenLayers `Map` is not constructed synchronously on mount. OL probes its target
element's size the instant `new Map({ target })` runs and logs a warning ("No map visible because
the map container's width or height are 0.") if that target is still `0x0` — which it typically is
on the very first render, before layout has resolved.

To avoid that, construction is deferred until the container actually has a non-zero size:

- A `ResizeObserver` watches the map container and calls `initMap()` the first time it reports a
  non-zero size.
- A `requestAnimationFrame` polling loop (`scheduleFallback`, up to 60 attempts, ~1s worst case at
  60fps) provides a fallback in case the observer never fires in time.
- `initMap()` is idempotent — it's a no-op if the map has already been constructed or the effect has
  been torn down (see below), so both paths can race without double-constructing the map.

A `disposed` flag, set in the effect's cleanup function, gates every entry point into `initMap()`
(the `ResizeObserver` callback and each `requestAnimationFrame` step). This matters because React's
`StrictMode` — and, per DCMS-430, the shipped v4.beta demo bundle running React in dev mode —
invokes an effect, its cleanup, and then the effect again on mount. Each invocation gets its own
`map` closure, so without `disposed` a callback scheduled by the first (torn-down) invocation could
still fire after cleanup and construct a second, undersized map.

The mount effect only runs once (`useEffect(..., [])`); the field/value/onChange it needs are
captured through a ref (`initRef`) updated on every render, rather than as effect dependencies, so
prop changes after mount don't re-initialize the map.

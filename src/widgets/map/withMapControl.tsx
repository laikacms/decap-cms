import React from 'react';
import { ClassNames } from '@emotion/react';
import olStyles from 'ol/ol.css?inline';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import GeoJSON from 'ol/format/GeoJSON';
import Draw from 'ol/interaction/Draw.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import OSMSource from 'ol/source/OSM.js';
import VectorSource from 'ol/source/Vector.js';

import type { Type as GeometryType } from 'ol/geom/Geometry';
import type { TranslateFunction } from '@/ui/default/index';

const formatOptions = {
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857',
};

function getDefaultFormat() {
  return new GeoJSON(formatOptions);
}

function getDefaultMap(target: HTMLElement, featuresLayer: VectorLayer<VectorSource>) {
  return new Map({
    target,
    layers: [new TileLayer({ source: new OSMSource() }), featuresLayer],
    view: new View({ center: [0, 0], zoom: 2 }),
  });
}

export interface MapControlField {
  type?: string;
  decimals?: number;
  [key: string]: unknown;
}

export interface MapControlProps {
  onChange: (...args: unknown[]) => unknown;
  field: MapControlField;
  height?: string;
  value?: React.ReactNode;
  classNameWrapper?: string;
  t: TranslateFunction;
}

export interface WithMapControlOptions {
  getFormat?: (field: MapControlField) => GeoJSON;
  getMap?: (target: HTMLElement, featuresLayer: VectorLayer<VectorSource>) => Map;
}

export default function withMapControl({ getFormat, getMap }: WithMapControlOptions = {}) {
  return function MapControl({
    field,
    onChange,
    value = '',
    height = '400px',
    classNameWrapper,
  }: MapControlProps) {
    const mapContainer = React.useRef<HTMLDivElement | null>(null);

    // Capture initial value/field via ref so the mount-only effect doesn't
    // re-initialize the map when props change. The original componentDidMount
    // also only ran once.
    const initRef = React.useRef({ field, value, onChange });
    initRef.current = { field, value, onChange };

    React.useEffect(() => {
      const { field: f, value: v } = initRef.current;
      const format = getFormat ? getFormat(f) : getDefaultFormat();
      const features = v ? [format.readFeature(v)] : [];

      const featuresSource = new VectorSource({ features, wrapX: false });
      const featuresLayer = new VectorLayer({ source: featuresSource });

      const target = mapContainer.current!;

      // OpenLayers probes the target's size synchronously on construction and
      // warns ("No map visible because the map container's width or height
      // are 0.") when layout hasn't resolved yet. Defer construction until the
      // container actually has non-zero layout so the probe never sees a 0x0
      // box; a ResizeObserver detects that moment, with a rAF fallback in case
      // the observer never reports a non-zero size.
      let map: Map | undefined;

      // React.StrictMode (and, per DCMS-430, the shipped v4.beta demo bundle
      // running React in dev mode) invokes this effect, its cleanup, and then
      // the effect again on mount. Each invocation gets a fresh `map` closure,
      // so without an explicit "this instance was torn down" flag a callback
      // scheduled by the first invocation (ResizeObserver or the rAF
      // fallback) can still fire after cleanup and construct a second,
      // undersized OL Map. `disposed` makes every entry point into this
      // effect instance a no-op once its cleanup has run, regardless of
      // whether the ResizeObserver/rAF cancellation actually pre-empted it.
      let disposed = false;

      const hasLayout = () => target.offsetWidth > 0 && target.offsetHeight > 0;

      const initMap = () => {
        if (disposed || map) {
          return;
        }
        map = getMap ? getMap(target, featuresLayer) : getDefaultMap(target, featuresLayer);
        if (features.length > 0) {
          map.getView().fit(featuresSource.getExtent(), { maxZoom: 16, padding: [80, 80, 80, 80] });
        }

        const draw = new Draw({
          source: featuresSource,
          type: (f.type ?? 'Point') as GeometryType,
        });
        map.addInteraction(draw);

        const writeOptions = { decimals: (f.decimals ?? 7) as number };
        draw.on('drawend', ({ feature }) => {
          featuresSource.clear();
          initRef.current.onChange(format.writeGeometry(feature.getGeometry()!, writeOptions));
        });

        requestAnimationFrame(() => {
          map?.updateSize();
        });
      };

      const resizeObserver = new ResizeObserver(() => {
        if (disposed) {
          return;
        }
        if (!map) {
          if (hasLayout()) {
            initMap();
          }
          return;
        }
        map.updateSize();
      });
      resizeObserver.observe(target);

      let fallbackRafId: number | undefined;

      // Mirrors the ResizeObserver branch above: re-check hasLayout() before
      // constructing so the rAF fallback can't build an undersized (or 0x0)
      // map on a route-transition frame where the container hasn't resolved
      // its layout yet. Reschedules, bounded, until either the observer or
      // this loop sees a non-zero size.
      //
      // The very first attempt also goes through this path (DCMS-430): there
      // used to be a separate synchronous `if (hasLayout()) initMap()` branch
      // at mount, so a StrictMode/dev-mode double-invoked mount could run
      // that synchronous branch twice against a container that was
      // transiently non-zero for a single frame, constructing two Maps.
      // Routing every attempt through `scheduleFallback` means both
      // invocations share the same `disposed`-gated, idempotent entry point.
      const scheduleFallback = (attemptsLeft: number) => {
        fallbackRafId = requestAnimationFrame(() => {
          if (disposed || map) {
            return;
          }
          if (hasLayout()) {
            initMap();
            return;
          }
          if (attemptsLeft > 0) {
            scheduleFallback(attemptsLeft - 1);
          }
        });
      };

      scheduleFallback(60); // ~1s worst case at 60fps

      return () => {
        disposed = true;
        resizeObserver.disconnect();
        if (fallbackRafId !== undefined) {
          cancelAnimationFrame(fallbackRafId);
        }
      };
    }, []);

    return (
      <ClassNames>
        {({ cx, css }) => (
          <div
            className={cx(
              classNameWrapper,
              css`
                ${olStyles};
                padding: 0;
                overflow: hidden;
                height: ${height};
              `,
            )}
            ref={mapContainer}
          />
        )}
      </ClassNames>
    );
  };
}

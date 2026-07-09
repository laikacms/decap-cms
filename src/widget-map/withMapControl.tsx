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
import type { TranslateFunction } from '../ui-default/index';

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

      const hasLayout = () => target.offsetWidth > 0 && target.offsetHeight > 0;

      const initMap = () => {
        if (map) {
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
      if (hasLayout()) {
        initMap();
      } else {
        fallbackRafId = requestAnimationFrame(() => {
          if (!map) {
            initMap();
          }
        });
      }

      return () => {
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

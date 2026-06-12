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

      let map: Map | null = null;

      const tryInit = () => {
        if (map !== null || target.offsetWidth === 0 || target.offsetHeight === 0) return;
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
      };

      const resizeObserver = new ResizeObserver(() => {
        tryInit();
        map?.updateSize();
      });
      resizeObserver.observe(target);

      return () => {
        resizeObserver.disconnect();
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

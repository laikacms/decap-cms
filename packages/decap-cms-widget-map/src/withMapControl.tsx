import React from 'react';
import PropTypes from 'prop-types';
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
import { TranslateFunction } from 'decap-cms-ui-default';

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
  get(key: string, defaultValue?: unknown): unknown;
}

export interface MapControlProps {
  onChange: (...args: unknown[]) => unknown;
  field: MapControlField;
  height?: string;
  value?: React.ReactNode;
  classNameWrapper?: string;
  t: TranslateFunction,
}

export interface WithMapControlOptions {
  getFormat?: (field: MapControlField) => GeoJSON;
  getMap?: (target: HTMLElement, featuresLayer: VectorLayer<VectorSource>) => Map;
}

export default function withMapControl({ getFormat, getMap }: WithMapControlOptions = {}) {
  return class MapControl extends React.Component<MapControlProps> {
    static propTypes = {
      onChange: PropTypes.func.isRequired,
      field: PropTypes.object.isRequired,
      height: PropTypes.string,
      value: PropTypes.node,
    };

    static defaultProps = {
      value: '',
      height: '400px',
    };

    mapContainer: React.RefObject<HTMLDivElement | null>;
    resizeObserver: ResizeObserver | null;

    constructor(props: MapControlProps) {
      super(props);
      this.mapContainer = React.createRef();
      this.resizeObserver = null;
    }

    componentDidMount() {
      // Manually validate PropTypes - React 19 breaking change
      PropTypes.checkPropTypes(MapControl.propTypes, this.props, 'prop', 'MapControl');

      const { field, onChange, value } = this.props;
      const format = getFormat ? getFormat(field) : getDefaultFormat();
      const features = value ? [format.readFeature(value)] : [];

      const featuresSource = new VectorSource({ features, wrapX: false });
      const featuresLayer = new VectorLayer({ source: featuresSource });

      const target = this.mapContainer.current;
      const map = getMap
        ? getMap(target!, featuresLayer)
        : getDefaultMap(target!, featuresLayer);
      if (features.length > 0) {
        map.getView().fit(featuresSource.getExtent(), { maxZoom: 16, padding: [80, 80, 80, 80] });
      }

      const draw = new Draw({
        source: featuresSource,
        type: field.get('type', 'Point') as GeometryType,
      });
      map.addInteraction(draw);

      const writeOptions = { decimals: field.get('decimals', 7) as number };
      draw.on('drawend', ({ feature }) => {
        featuresSource.clear();
        onChange(format.writeGeometry(feature.getGeometry()!, writeOptions));
      });

      this.resizeObserver = new ResizeObserver(() => {
        map.updateSize();
      });

      this.resizeObserver.observe(target!);
    }

    componentWillUnmount() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
    }

    render() {
      const { height } = this.props;

      return (
        <ClassNames>
          {({ cx, css }) => (
            <div
              className={cx(
                this.props.classNameWrapper,
                css`
                  ${olStyles};
                  padding: 0;
                  overflow: hidden;
                  height: ${height};
                `,
              )}
              ref={this.mapContainer}
            />
          )}
        </ClassNames>
      );
    }
  };
}

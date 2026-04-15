import React from 'react';
import PropTypes from 'prop-types';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

interface MapPreviewProps {
  value?: string;
}

function MapPreview({ value }: MapPreviewProps) {
  return <WidgetPreviewContainer>{value ? value.toString() : null}</WidgetPreviewContainer>;
}

MapPreview.propTypes = {
  value: PropTypes.string,
};

export default MapPreview;

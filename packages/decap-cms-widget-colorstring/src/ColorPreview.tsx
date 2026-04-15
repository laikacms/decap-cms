import React from 'react';
import PropTypes from 'prop-types';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

interface ColorPreviewProps {
  value?: React.ReactNode;
}

function ColorPreview({ value }: ColorPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

ColorPreview.propTypes = {
  value: PropTypes.node,
};

export default ColorPreview;

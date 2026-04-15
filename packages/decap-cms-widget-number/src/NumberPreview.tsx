import React from 'react';
import PropTypes from 'prop-types';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

interface NumberPreviewProps {
  value?: React.ReactNode;
}

function NumberPreview({ value }: NumberPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

NumberPreview.propTypes = {
  value: PropTypes.node,
};

export default NumberPreview;

import React from 'react';
import PropTypes from 'prop-types';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

interface StringPreviewProps {
  value?: React.ReactNode;
}

function StringPreview({ value }: StringPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

StringPreview.propTypes = {
  value: PropTypes.node,
};

export default StringPreview;

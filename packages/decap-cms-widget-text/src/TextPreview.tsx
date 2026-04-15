import React from 'react';
import PropTypes from 'prop-types';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

interface TextPreviewProps {
  value?: React.ReactNode;
}

function TextPreview({ value }: TextPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

TextPreview.propTypes = {
  value: PropTypes.node,
};

export default TextPreview;

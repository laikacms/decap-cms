import React from 'react';
import PropTypes from 'prop-types';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

interface RelationPreviewProps {
  value?: React.ReactNode;
}

function RelationPreview({ value }: RelationPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

RelationPreview.propTypes = {
  value: PropTypes.node,
};

export default RelationPreview;

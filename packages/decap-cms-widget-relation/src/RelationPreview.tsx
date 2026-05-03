import React from 'react';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

interface RelationPreviewProps {
  value?: React.ReactNode;
}

function RelationPreview({ value }: RelationPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

export default RelationPreview;

import React from 'react';

import { WidgetPreviewContainer } from '../ui-default/index';

interface RelationPreviewProps {
  value?: React.ReactNode;
}

function RelationPreview({ value }: RelationPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

export default RelationPreview;

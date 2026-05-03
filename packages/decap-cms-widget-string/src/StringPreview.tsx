import React from 'react';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

interface StringPreviewProps {
  value?: React.ReactNode;
}

function StringPreview({ value }: StringPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

export default StringPreview;

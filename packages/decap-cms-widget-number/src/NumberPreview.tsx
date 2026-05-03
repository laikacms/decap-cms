import React from 'react';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

interface NumberPreviewProps {
  value?: React.ReactNode;
}

function NumberPreview({ value }: NumberPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

export default NumberPreview;

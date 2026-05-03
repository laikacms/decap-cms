import React from 'react';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

interface ColorPreviewProps {
  value?: React.ReactNode;
}

function ColorPreview({ value }: ColorPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

export default ColorPreview;

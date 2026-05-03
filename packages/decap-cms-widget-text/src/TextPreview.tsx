import React from 'react';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

interface TextPreviewProps {
  value?: React.ReactNode;
}

function TextPreview({ value }: TextPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

export default TextPreview;

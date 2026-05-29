import React from 'react';
import { WidgetPreviewContainer } from '../ui-default/index';

interface StringPreviewProps {
  value?: React.ReactNode;
}

function StringPreview({ value }: StringPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

export default StringPreview;

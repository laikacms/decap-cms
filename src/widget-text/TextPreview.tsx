import React from 'react';

import { WidgetPreviewContainer } from '../ui-default/index';

interface TextPreviewProps {
  value?: React.ReactNode;
}

function TextPreview({ value }: TextPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

export default TextPreview;

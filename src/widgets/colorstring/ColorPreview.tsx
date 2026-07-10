import React from 'react';

import { WidgetPreviewContainer } from '../../ui/default/index';

interface ColorPreviewProps {
  value?: React.ReactNode;
}

function ColorPreview({ value }: ColorPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

export default ColorPreview;

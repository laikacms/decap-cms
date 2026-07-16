import React from 'react';

import { WidgetPreviewContainer } from '@/ui/default/index';

interface NumberPreviewProps {
  value?: React.ReactNode;
}

function NumberPreview({ value }: NumberPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

export default NumberPreview;

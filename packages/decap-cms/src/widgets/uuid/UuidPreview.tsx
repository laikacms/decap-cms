import React from 'react';

import { WidgetPreviewContainer } from '@/ui/default/index';

interface UuidPreviewProps {
  value?: React.ReactNode;
}

function UuidPreview({ value }: UuidPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

export default UuidPreview;

import React from 'react';

import { WidgetPreviewContainer } from '@/ui/default/index';

interface AutoincrementPreviewProps {
  value?: React.ReactNode;
}

function AutoincrementPreview({ value }: AutoincrementPreviewProps) {
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

export default AutoincrementPreview;

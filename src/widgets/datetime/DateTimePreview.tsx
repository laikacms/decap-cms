import React from 'react';

import { WidgetPreviewContainer } from '@/ui/default/index';

interface DatePreviewProps {
  value?: Record<string, unknown> | string;
}

function DatePreview({ value }: DatePreviewProps) {
  return <WidgetPreviewContainer>{value ? value.toString() : null}</WidgetPreviewContainer>;
}

export default DatePreview;

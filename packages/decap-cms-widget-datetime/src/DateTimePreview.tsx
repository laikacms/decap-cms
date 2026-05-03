import React from 'react';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

interface DatePreviewProps {
  value?: Record<string, unknown> | string;
}

function DatePreview({ value }: DatePreviewProps) {
  return <WidgetPreviewContainer>{value ? value.toString() : null}</WidgetPreviewContainer>;
}

export default DatePreview;

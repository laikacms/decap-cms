import React from 'react';

import { WidgetPreviewContainer } from 'decap-cms/ui-default';

interface MapPreviewProps {
  value?: string;
}

function MapPreview({ value }: MapPreviewProps) {
  return <WidgetPreviewContainer>{value ? value.toString() : null}</WidgetPreviewContainer>;
}

export default MapPreview;

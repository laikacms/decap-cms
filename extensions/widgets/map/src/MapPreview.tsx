import React from 'react';

import { WidgetPreviewContainer } from '@laikacms/decap-cms/ui-default';

interface MapPreviewProps {
  value?: string;
}

function MapPreview({ value }: MapPreviewProps) {
  return <WidgetPreviewContainer>{value ? value.toString() : null}</WidgetPreviewContainer>;
}

export default MapPreview;

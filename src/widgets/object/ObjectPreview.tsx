import React from 'react';
import { get } from 'lodash-es';

import { WidgetPreviewContainer } from '@/ui/default/index';

interface ObjectPreviewProps {
  field?: Map<string, unknown> | Record<string, unknown>;
}

function ObjectPreview({ field }: ObjectPreviewProps) {
  const f = get(field, 'field') || get(field, 'fields');

  return <WidgetPreviewContainer>{(f as React.ReactNode) ?? null}</WidgetPreviewContainer>;
}

export default ObjectPreview;

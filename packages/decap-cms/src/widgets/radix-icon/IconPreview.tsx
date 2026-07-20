import * as allIcons from '@radix-ui/react-icons';
import React from 'react';

import type { CmsWidgetPreviewProps } from '@/lib/util/index';

export const IconPreview: React.FC<CmsWidgetPreviewProps<string>> = ({ value }) => {
  if (!value) return null;

  const SelectedIcon = allIcons[value as keyof typeof allIcons] || undefined;

  return (
    <div style={{ fontSize: '2em' }}>
      {SelectedIcon && React.createElement(SelectedIcon)}
    </div>
  );
};

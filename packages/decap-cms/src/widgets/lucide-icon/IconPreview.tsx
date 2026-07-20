import { icons as lucideIcons } from 'lucide-react';
import React from 'react';

import type { CmsWidgetPreviewProps } from '@/lib/util/index';

const allIcons = Object.fromEntries(Object.entries(lucideIcons));

export const IconPreview: React.FC<CmsWidgetPreviewProps<string>> = ({ value }) => {
  if (!value) return null;

  const SelectedIcon = allIcons[value as keyof typeof allIcons] || undefined;

  return (
    <div style={{ fontSize: '2em' }}>
      {SelectedIcon && React.createElement(SelectedIcon)}
    </div>
  );
};

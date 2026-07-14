import React from 'react';

import type { CmsEntryField } from '@/lib/util/index';

type EntryField = CmsEntryField;

interface PreviewHOCProps {
  previewComponent: React.ComponentType<Record<string, unknown>>;
  field: EntryField;
  value?: React.ReactNode | Record<string, unknown> | string | boolean;
  fieldsMetaData?: Record<string, unknown>;
  getAsset?: (asset: string) => { url: string; path: string; field?: EntryField };
}

function PreviewHOCInner({ previewComponent, ...props }: PreviewHOCProps) {
  if (typeof previewComponent !== 'function' && typeof previewComponent !== 'object') {
    console.warn(
      `Invalid preview component for field "${props.field?.name ?? 'unknown'}": ` +
        `expected a React component but received ${typeof previewComponent}. ` +
        `The preview for this field will not be rendered.`,
    );
    return null;
  }
  return React.createElement(previewComponent, props);
}

/**
 * Only re-render on value change, but always re-render objects and lists.
 * Their child widgets will each also be wrapped with this component, and
 * will only be updated on value change.
 */
const PreviewHOC = React.memo(PreviewHOCInner, (prev, next) => {
  const isWidgetContainer = ['object', 'list'].includes(next.field.widget);
  if (isWidgetContainer) return false;
  return (
    prev.value === next.value &&
    prev.fieldsMetaData === next.fieldsMetaData &&
    prev.getAsset === next.getAsset
  );
});

export default PreviewHOC;

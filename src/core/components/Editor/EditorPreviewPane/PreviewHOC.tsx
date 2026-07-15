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
 * Only re-render on value change, but always re-render objects, lists, and
 * richtext.
 *
 * Object/list widgets are excluded because their child widgets are each also
 * wrapped with this component and will only be updated on their own value
 * change. Richtext is excluded because its value is a `RichtextValue` proxy
 * (see `src/lib/richtext/RichtextValue.ts`) that keeps a stable identity
 * across renders and only mutates its internal `portableText`/`editorState`
 * in place — `prev.value === next.value` is therefore always true while the
 * user types, and without this bypass the preview would never re-render.
 */
const ALWAYS_RERENDER_WIDGETS = ['object', 'list', 'richtext'];

const PreviewHOC = React.memo(PreviewHOCInner, (prev, next) => {
  const isWidgetContainer = ALWAYS_RERENDER_WIDGETS.includes(next.field.widget);
  if (isWidgetContainer) return false;
  return (
    prev.value === next.value &&
    prev.fieldsMetaData === next.fieldsMetaData &&
    prev.getAsset === next.getAsset
  );
});

export default PreviewHOC;

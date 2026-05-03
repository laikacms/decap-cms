import React from 'react';

import type { CmsEntryField } from 'decap-cms-lib-util';

type EntryField = CmsEntryField;

interface PreviewHOCProps {
  previewComponent: React.ComponentType<Record<string, unknown>>;
  field: EntryField;
  value?: React.ReactNode | Record<string, unknown> | string | boolean;
  fieldsMetaData?: Record<string, unknown>;
  getAsset?: (asset: string) => { url: string; path: string; field?: EntryField };
}

class PreviewHOC extends React.Component<PreviewHOCProps> {
  /**
   * Only re-render on value change, but always re-render objects and lists.
   * Their child widgets will each also be wrapped with this component, and
   * will only be updated on value change.
   */
  shouldComponentUpdate(nextProps: PreviewHOCProps) {
    const isWidgetContainer = ['object', 'list'].includes(nextProps.field.widget);
    return (
      isWidgetContainer ||
      this.props.value !== nextProps.value ||
      this.props.fieldsMetaData !== nextProps.fieldsMetaData ||
      this.props.getAsset !== nextProps.getAsset
    );
  }

  render() {
    const { previewComponent, ...props } = this.props;
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
}

export default PreviewHOC;

import DOMPurify from 'dompurify';

import { WidgetPreviewContainer } from '@/ui/default/index';
import { getEditorComponents } from './editorComponents';
import { markdownToHtml } from './serializers/index';

import type { CmsWidgetPreviewProps } from '@/lib/util/index';
import type { PluggableList } from 'unified';
import type { GetAssetFunction, ResolveWidgetFunction, RichtextField } from './types';

// Block-specific styles, injected into the preview iframe.
const previewStyles = `
  blockquote {
    padding-left: 16px;
    border-left: 3px solid #eff0f4;
    margin-left: 0;
    margin-right: 0;
    margin-bottom: 16px;
  }

  code {
    background-color: #eff0f4;
    border-radius: 5px;
    padding: 0 2px;
    font-size: 85%;
  }

  pre {
    background-color: #eff0f4;
    border-radius: 5px;
    padding: 12px 16px;
    overflow-x: auto;
    margin-bottom: 16px;
  }

  pre code {
    background-color: transparent;
    padding: 0;
    font-size: 85%;
    border-radius: 0;
  }
`;

export interface RichtextPreviewProps extends Omit<CmsWidgetPreviewProps<string, RichtextField>, 'getAsset'> {
  getAsset?: GetAssetFunction | undefined;
  resolveWidget?: ResolveWidgetFunction | undefined;
  getRemarkPlugins?: (() => PluggableList) | undefined;
}

export default function RichtextPreview({
  value,
  getAsset,
  resolveWidget,
  field,
  getRemarkPlugins,
}: RichtextPreviewProps) {
  if (value === null || value === undefined) {
    return null;
  }

  const html = markdownToHtml(value, {
    getAsset,
    resolveWidget,
    remarkPlugins: getRemarkPlugins?.() ?? [],
    editorComponents: getEditorComponents(),
  });

  const shouldSanitizePreview = field?.sanitize_preview ?? true;
  const toRender = shouldSanitizePreview ? DOMPurify.sanitize(html) : html;

  return (
    <WidgetPreviewContainer>
      <style>{previewStyles}</style>
      <div dangerouslySetInnerHTML={{ __html: toRender }} />
    </WidgetPreviewContainer>
  );
}

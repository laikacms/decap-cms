import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { WidgetPreviewContainer } from '../ui-default/index';

interface MarkdownPreviewProps {
  value?: string;
}

function MarkdownPreview({ value }: MarkdownPreviewProps) {
  return (
    <WidgetPreviewContainer>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || ''}</ReactMarkdown>
    </WidgetPreviewContainer>
  );
}

export default MarkdownPreview;

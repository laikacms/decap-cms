import React from 'react';

import { bidiControls } from '../lib-widgets/index';
import { WidgetPreviewContainer } from '../ui-default/index';

interface TextPreviewProps {
  value?: React.ReactNode;
}

// Renders bidi control characters (see DCMS-415 / DCMS-429) as a visible,
// non-reordering `<RLO>`-style badge instead of letting them silently
// reverse/reorder the surrounding preview text (Trojan Source-style
// spoofing).
function renderWithBidiHighlights(value: React.ReactNode) {
  if (typeof value !== 'string' || !bidiControls.containsBidiControls(value)) {
    return value;
  }
  return bidiControls.splitOnBidiControls(value).map((segment, index) => {
    if (!segment.control) {
      return segment.text;
    }
    return (
      <span
        key={index}
        title={`Unicode bidi control character (${segment.control}). This character is normally invisible and can reorder surrounding text.`}
        style={{
          color: '#c53030',
          border: '1px solid #c53030',
          borderRadius: '2px',
          padding: '0 2px',
          fontSize: '0.85em',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}
      >
        {`<${segment.control}>`}
      </span>
    );
  });
}

function TextPreview({ value }: TextPreviewProps) {
  return <WidgetPreviewContainer>{renderWithBidiHighlights(value)}</WidgetPreviewContainer>;
}

export default TextPreview;

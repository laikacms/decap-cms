import React from 'react';
import PropTypes from 'prop-types';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';
import { bidiControls } from 'decap-cms-lib-widgets';

// Renders bidi control characters (see DCMS-415) as a visible, non-reordering
// `<RLO>`-style badge instead of letting them silently reverse/reorder the
// surrounding preview text (Trojan Source-style spoofing).
function renderWithBidiHighlights(value) {
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
        css={{
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

function TextPreview({ value }) {
  return <WidgetPreviewContainer>{renderWithBidiHighlights(value)}</WidgetPreviewContainer>;
}

TextPreview.propTypes = {
  value: PropTypes.node,
};

export default TextPreview;

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

function StringPreview({ value, field }) {
  const tagname = field && field.get('tagname');
  if (tagname) {
    // `value` can already be a fully-rendered React element rather than a raw
    // string: inferred fields (e.g. the `title`/`shortTitle`/`author` synonyms
    // detected by `selectInferredField`) wrap the raw value in their own
    // element (e.g. `<h1>`) before it ever reaches this widget. Wrapping that
    // element in `tagname` again would double-wrap it (e.g.
    // `<h1><h1>…</h1></h1>`), which is invalid HTML and trips a React
    // hydration error. When the value is already an element, render it as-is.
    if (React.isValidElement(value)) {
      return value;
    }
    return React.createElement(tagname, null, renderWithBidiHighlights(value));
  }
  return <WidgetPreviewContainer>{renderWithBidiHighlights(value)}</WidgetPreviewContainer>;
}

StringPreview.propTypes = {
  value: PropTypes.node,
  field: PropTypes.object,
};

export default StringPreview;

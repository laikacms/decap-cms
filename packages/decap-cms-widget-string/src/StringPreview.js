import React from 'react';
import PropTypes from 'prop-types';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

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
    return React.createElement(tagname, null, value);
  }
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

StringPreview.propTypes = {
  value: PropTypes.node,
  field: PropTypes.object,
};

export default StringPreview;

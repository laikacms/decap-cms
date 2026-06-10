import React from 'react';
import PropTypes from 'prop-types';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

function StringPreview({ value, field }) {
  const tagname = field && field.get('tagname');
  if (tagname) {
    return React.createElement(tagname, null, value);
  }
  return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
}

StringPreview.propTypes = {
  value: PropTypes.node,
  field: PropTypes.object,
};

export default StringPreview;

import React from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

interface ObjectPreviewProps {
  field?: Map<string, unknown> | Record<string, unknown>;
}

function ObjectPreview({ field }: ObjectPreviewProps) {
  const f = get(field, 'field') || get(field, 'fields');

  return <WidgetPreviewContainer>{(f as React.ReactNode) ?? null}</WidgetPreviewContainer>;
}

ObjectPreview.propTypes = {
  field: PropTypes.node,
};

export default ObjectPreview;

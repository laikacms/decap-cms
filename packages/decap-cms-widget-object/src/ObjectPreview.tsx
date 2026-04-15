import React from 'react';
import PropTypes from 'prop-types';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';
import { fromJS, Map } from 'immutable';

interface ObjectPreviewProps {
  field?: Map<string, unknown> | Record<string, unknown>;
}

function ObjectPreview({ field }: ObjectPreviewProps) {
  let immutableField: Map<string, unknown> | undefined;

  if (field) {
    immutableField = Map.isMap(field) ? (field as Map<string, unknown>) : fromJS(field) as Map<string, unknown>;
  }

  return (
    <WidgetPreviewContainer>
      {(immutableField && (immutableField.get('fields') || immutableField.get('field'))) as React.ReactNode ?? null}
    </WidgetPreviewContainer>
  );
}

ObjectPreview.propTypes = {
  field: PropTypes.node,
};

export default ObjectPreview;

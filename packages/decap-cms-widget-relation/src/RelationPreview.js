import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { List } from 'immutable';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

import { getCachedDisplayLabel, normalizeField } from './RelationControl';

/**
 * Resolves a single stored relation value (a value_field, e.g. a slug/id) to
 * its cached `display_fields` label, falling back to the raw value when the
 * entry hasn't been searched/loaded yet and no metadata is cached for it.
 */
function resolveValue(field, fieldsMetaData, rawValue) {
  const label = getCachedDisplayLabel(fieldsMetaData, field, rawValue);
  return label !== undefined ? label : rawValue;
}

function RelationPreview({ value, field, fieldsMetaData }) {
  if (!field) {
    return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
  }

  const normalizedField = normalizeField(field);
  const isMultiple = normalizedField.get('multiple', false);

  if (isMultiple) {
    const values = List.isList(value) ? value.toJS() : value;
    if (!Array.isArray(values)) {
      return <WidgetPreviewContainer>{value}</WidgetPreviewContainer>;
    }

    return (
      <WidgetPreviewContainer>
        <ul>
          {values.map((rawValue, idx) => (
            <li key={idx}>{resolveValue(normalizedField, fieldsMetaData, rawValue)}</li>
          ))}
        </ul>
      </WidgetPreviewContainer>
    );
  }

  return (
    <WidgetPreviewContainer>
      {resolveValue(normalizedField, fieldsMetaData, value)}
    </WidgetPreviewContainer>
  );
}

RelationPreview.propTypes = {
  value: PropTypes.node,
  field: ImmutablePropTypes.map,
  fieldsMetaData: ImmutablePropTypes.map,
};

export default RelationPreview;

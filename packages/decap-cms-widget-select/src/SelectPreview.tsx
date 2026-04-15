import PropTypes from 'prop-types';
import React from 'react';
import { List } from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

import type { List as ImmutableList } from 'immutable';

function ListPreview({ values }: { values: ImmutableList<unknown> }) {
  return (
    <ul>
      {values.map((value: unknown, idx: number) => (
        <li key={idx}>{value as React.ReactNode}</li>
      ))}
    </ul>
  );
}

interface SelectPreviewProps {
  value?: string | ImmutableList<unknown>;
}

function SelectPreview({ value }: SelectPreviewProps) {
  return (
    <WidgetPreviewContainer>
      {value && (List.isList(value) ? <ListPreview values={value} /> : value)}
      {!value && null}
    </WidgetPreviewContainer>
  );
}

SelectPreview.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, ImmutablePropTypes.list]),
};

export default SelectPreview;

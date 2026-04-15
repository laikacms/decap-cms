import React from 'react';
import PropTypes from 'prop-types';
import { Map } from 'immutable';
import isString from 'lodash/isString';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

import type { Map as ImmutableMap } from 'immutable';

function toValue(
  value: ImmutableMap<string, unknown> | string | undefined,
  field?: ImmutableMap<string, unknown>,
): string {
  if (isString(value)) {
    return value;
  }
  if (Map.isMap(value) && field) {
    return (value as ImmutableMap<string, unknown>).get(
      (field as ImmutableMap<string, unknown>).getIn(['keys', 'code'], 'code') as string,
      '',
    ) as string;
  }
  return '';
}

interface CodePreviewProps {
  value?: ImmutableMap<string, unknown> | string;
  field?: ImmutableMap<string, unknown>;
}

function CodePreview(props: CodePreviewProps) {
  return (
    <WidgetPreviewContainer>
      <pre>
        <code>{toValue(props.value, props.field)}</code>
      </pre>
    </WidgetPreviewContainer>
  );
}

CodePreview.propTypes = {
  value: PropTypes.node,
};

export default CodePreview;

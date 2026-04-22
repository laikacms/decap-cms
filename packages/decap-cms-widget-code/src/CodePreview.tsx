import React from 'react';
import PropTypes from 'prop-types';
import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import get from 'lodash/get';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

function toValue(
  value: Record<string, unknown> | string | undefined,
  field?: Record<string, unknown>,
): string {
  if (isString(value)) {
    return value;
  }
  if (isObject(value) && field) {
    return (value as Record<string, unknown>)[
      get(field, ['keys', 'code'], 'code')
    ] as string || '';
  }
  return '';
}

interface CodePreviewProps {
  value?: Record<string, unknown> | string;
  field?: Record<string, unknown>;
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
  value: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  field: PropTypes.object,
};

export default CodePreview;

import React from 'react';
import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import get from 'lodash/get';

import { WidgetPreviewContainer } from '@/ui/default/index';

function toValue(
  value: Record<string, unknown> | string | undefined,
  field?: Record<string, unknown>,
): string {
  if (isString(value)) {
    return value;
  }
  if (isObject(value) && field) {
    return (
      ((value as Record<string, unknown>)[get(field, ['keys', 'code'], 'code')] as string) || ''
    );
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

export default CodePreview;

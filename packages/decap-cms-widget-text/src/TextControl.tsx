import React from 'react';
import Textarea from 'react-textarea-autosize';

import type { TranslateFunction } from 'decap-cms-ui-default';
import type { CmsFieldBase, CmsFieldStringOrText } from 'decap-cms-lib-util';

interface TextControlProps {
  onChange: (value: string) => void;
  forID?: string;
  value?: string;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  field: CmsFieldStringOrText & CmsFieldBase;
  t: TranslateFunction;
}

export default function TextControl({
  forID,
  value = '',
  onChange,
  classNameWrapper,
  setActiveStyle,
  setInactiveStyle,
}: TextControlProps) {
  return (
    <Textarea
      id={forID}
      value={value || ''}
      className={classNameWrapper}
      onFocus={setActiveStyle}
      onBlur={setInactiveStyle}
      minRows={5}
      style={{ fontFamily: 'inherit' }}
      onChange={e => onChange(e.target.value)}
    />
  );
}

import React from 'react';
import Textarea from 'react-textarea-autosize';

import type { TranslateFunction } from '../ui-default/index';
import type { CmsFieldBase, CmsFieldMarkdown } from '../lib-util/index';

interface MarkdownControlProps {
  onChange: (value: string) => void;
  forID?: string;
  value?: string;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  field: CmsFieldMarkdown & CmsFieldBase;
  t: TranslateFunction;
}

export default function MarkdownControl({
  forID,
  value = '',
  onChange,
  classNameWrapper,
  setActiveStyle,
  setInactiveStyle,
}: MarkdownControlProps) {
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

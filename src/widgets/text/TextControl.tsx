import React from 'react';
import Textarea from 'react-textarea-autosize';

import { bidiControls } from '../lib-widgets/index';

import type { TranslateFunction } from '../ui-default/index';
import type { CmsFieldBase, CmsFieldStringOrText } from '../lib-util/index';

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
  const hasBidiControls = bidiControls.containsBidiControls(value);

  return (
    <>
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
      {hasBidiControls && (
        <span
          role="alert"
          title="This value contains an invisible Unicode bidi control character (e.g. U+202E RIGHT-TO-LEFT OVERRIDE), which can make it render very differently from how it is stored. This can be used to spoof file names/titles (Trojan Source). Review the raw value carefully before saving."
          style={{ color: '#c53030', marginLeft: '4px', cursor: 'help' }}
        >
          ⚠
        </span>
      )}
    </>
  );
}

import React, { useEffect, useRef } from 'react';

import type { TranslateFunction } from 'decap-cms-ui-default';
import type { CmsFieldBase, CmsFieldStringOrText } from 'decap-cms-lib-util';

interface StringControlProps {
  onChange: (value: string) => void;
  forID?: string | undefined;
  value?: string | undefined;
  field: CmsFieldStringOrText & CmsFieldBase;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  t: TranslateFunction;
}

// NOTE: Tracking the selection manually prevents the cursor from jumping to
// the end of the text for nested inputs (e.g. alt text on a block image
// inside a markdown widget). See:
// https://github.com/decaporg/decap-cms/issues/4539
// https://github.com/decaporg/decap-cms/issues/3578
export default function StringControl({
  onChange,
  forID,
  value = '',
  classNameWrapper,
  setActiveStyle,
  setInactiveStyle,
}: StringControlProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectionRef = useRef(0);

  useEffect(() => {
    const el = inputRef.current;
    if (el && el.selectionStart !== selectionRef.current) {
      el.setSelectionRange(selectionRef.current, selectionRef.current);
    }
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    selectionRef.current = e.target.selectionStart ?? 0;
    onChange(e.target.value);
  }

  return (
    <input
      ref={inputRef}
      type="text"
      id={forID}
      className={classNameWrapper}
      value={value || ''}
      onChange={handleChange}
      onFocus={setActiveStyle}
      onBlur={setInactiveStyle}
    />
  );
}

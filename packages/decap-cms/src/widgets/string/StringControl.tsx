import React, { useEffect, useRef } from 'react';

import { bidiControls } from '@/lib/widgets/index';

import type { CmsFieldBase, CmsFieldStringOrText } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

interface StringControlProps {
  onChange: (value: string) => void;
  forID?: string | undefined;
  value?: string | undefined;
  field: CmsFieldStringOrText & CmsFieldBase;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  t: TranslateFunction;
  hasErrors?: boolean;
  errorListId?: string;
  hintId?: string;
}

// NOTE: Tracking the selection manually prevents the cursor from jumping to
// the end of the text for nested inputs (e.g. alt text on a block image
// inside a richtext widget). See:
// https://github.com/decaporg/decap-cms/issues/4539
// https://github.com/decaporg/decap-cms/issues/3578
export default function StringControl({
  onChange,
  forID,
  value = '',
  field,
  classNameWrapper,
  setActiveStyle,
  setInactiveStyle,
  hasErrors,
  errorListId,
  hintId,
}: StringControlProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Only track the selection across re-renders that follow a user-initiated
  // change. On the initial mount and on external value updates we let the
  // browser keep its native caret position so e.g. focus-then-type lands at
  // the end of the existing value.
  const pendingSelection = useRef<number | null>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (el && pendingSelection.current !== null) {
      const pos = pendingSelection.current;
      pendingSelection.current = null;
      if (el.selectionStart !== pos) {
        el.setSelectionRange(pos, pos);
      }
    }
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    pendingSelection.current = e.target.selectionStart ?? 0;
    onChange(e.target.value);
  }

  const hasBidiControls = bidiControls.containsBidiControls(value);

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        id={forID}
        className={classNameWrapper}
        value={value || ''}
        onChange={handleChange}
        onFocus={setActiveStyle}
        onBlur={setInactiveStyle}
        aria-required={field.required !== false}
        aria-invalid={hasErrors || undefined}
        aria-errormessage={hasErrors ? errorListId : undefined}
        aria-describedby={hintId}
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

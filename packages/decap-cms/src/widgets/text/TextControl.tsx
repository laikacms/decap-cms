import React, { useEffect, useReducer, useRef } from 'react';
import Textarea from 'react-textarea-autosize';

import { bidiControls } from '@/lib/widgets/index';

import type { CmsFieldBase, CmsFieldStringOrText } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

interface TextControlProps {
  onChange: (value: string) => void;
  forID?: string;
  value?: string;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  field: CmsFieldStringOrText & CmsFieldBase;
  t: TranslateFunction;
  hasErrors?: boolean;
  errorListId?: string;
  hintId?: string;
}

export default function TextControl({
  forID,
  value = '',
  onChange,
  field,
  classNameWrapper,
  setActiveStyle,
  setInactiveStyle,
  hasErrors,
  errorListId,
  hintId,
}: TextControlProps) {
  const hasBidiControls = bidiControls.containsBidiControls(value);

  // react-textarea-autosize only measures on render and window resize. When
  // the field mounts before its pane has its final width (hidden, collapsed,
  // mid-layout), the text wraps into a too-narrow column and the computed
  // height is far too large until something re-renders the control. Force a
  // re-measure whenever the textarea's width actually changes.
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastWidth = useRef(0);
  const [, remeasure] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    lastWidth.current = el.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (el.offsetWidth !== lastWidth.current) {
        lastWidth.current = el.offsetWidth;
        remeasure();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Textarea
        ref={textareaRef}
        id={forID}
        value={value || ''}
        className={classNameWrapper}
        onFocus={setActiveStyle}
        onBlur={setInactiveStyle}
        minRows={5}
        style={{ fontFamily: 'inherit' }}
        onChange={e => onChange(e.target.value)}
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

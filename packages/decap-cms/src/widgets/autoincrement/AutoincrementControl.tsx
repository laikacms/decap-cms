import React from 'react';

import type { CmsFieldAutoincrement, CmsFieldBase } from '@/lib/util/index';

interface AutoincrementControlProps {
  onChange: (value: number | string) => void;
  forID?: string | undefined;
  value?: number | string | undefined;
  field: CmsFieldAutoincrement & CmsFieldBase;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  hasErrors?: boolean;
  errorListId?: string;
  hintId?: string;
}

// The value itself is computed once, at entry-creation time, by the
// `createEmptyDraft` thunk (`core/actions/entries.tsx`) - max value already
// used for this field across the collection's other entries, plus 1 (or the
// field's `start`). That computation needs cross-entry state this component
// doesn't have access to, so unlike the `uuid` widget's `UuidControl`, this
// control never generates a value itself; it only displays the one already
// written into the draft, and (when `read_only: false`) lets an editor
// override it by hand.
export default function AutoincrementControl({
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
}: AutoincrementControlProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '') {
      onChange('');
      return;
    }

    const parsed = Number(raw);
    onChange(Number.isNaN(parsed) ? raw : parsed);
  }

  const readOnly = field.read_only ?? true;

  return (
    <input
      type="number"
      id={forID}
      readOnly={readOnly}
      style={{ opacity: readOnly ? 0.5 : 1 }}
      className={classNameWrapper}
      value={value}
      onChange={handleChange}
      onFocus={setActiveStyle}
      onBlur={setInactiveStyle}
      aria-required={field.required !== false}
      aria-invalid={hasErrors || undefined}
      aria-errormessage={hasErrors ? errorListId : undefined}
      aria-describedby={hintId}
    />
  );
}

import React, { useEffect, useRef } from 'react';

import { randomUUID } from '@/lib/util/index';
import { uuidToBase32 } from './base32';

import type { CmsFieldBase, CmsFieldUuid, CmsI18nConfig } from '@/lib/util/index';

interface UuidControlProps {
  onChange: (value: string) => void;
  forID?: string | undefined;
  value?: string | undefined;
  field: CmsFieldUuid & CmsFieldBase;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  // Not part of the shared `CmsWidgetControlProps` contract, but forwarded to
  // every control by `core/components/Editor/EditorControlPane/Widget.tsx`.
  collection?: { i18n?: boolean | CmsI18nConfig } | undefined;
  locale?: string | undefined;
  hasErrors?: boolean;
  errorListId?: string;
  hintId?: string;
}

// NOTE: Tracking the selection manually prevents the cursor from jumping to
// the end of the text for nested inputs. See the same note on StringControl,
// and decaporg/decap-cms#4539 / decaporg/decap-cms#3578.
export default function UuidControl({
  onChange,
  forID,
  value = '',
  field,
  classNameWrapper,
  setActiveStyle,
  setInactiveStyle,
  collection,
  locale,
  hasErrors,
  errorListId,
  hintId,
}: UuidControlProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
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

  // Generate a UUID on first mount when the field has no value yet. Skipped
  // for a non-default locale unless the field is explicitly translatable —
  // otherwise every locale of an i18n entry would mint its own id.
  useEffect(() => {
    const defaultLocale = typeof collection?.i18n === 'object' ? collection.i18n.default_locale : undefined;
    const isTranslatable = field.i18n === 'translate';
    const shouldGenerate = !locale || !defaultLocale || locale === defaultLocale || isTranslatable;

    if (!value && shouldGenerate) {
      const prefix = field.prefix ?? '';
      const uuid = randomUUID();
      const formatted = field.use_b32_encoding ? uuidToBase32(uuid) : uuid;
      onChange(prefix + formatted);
    }
    // Only ever runs once, on mount — matches the upstream widget's
    // componentDidMount-only generation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    pendingSelection.current = e.target.selectionStart ?? 0;
    onChange(e.target.value);
  }

  const readOnly = field.read_only ?? true;

  return (
    <input
      ref={inputRef}
      type="text"
      id={forID}
      readOnly={readOnly}
      style={{ fontFamily: 'monospace', opacity: readOnly ? 0.5 : 1 }}
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
  );
}

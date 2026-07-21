import React from 'react';

import { colors, Toggle, ToggleBackground } from '@/ui/default/index';

import type { CmsFieldBase, CmsFieldBoolean } from '@/lib/util/index';
import type { ToggleActiveProps } from '@/ui/default/Toggle';

function BooleanBackground({ $isActive, ...props }: ToggleActiveProps) {
  return (
    <ToggleBackground
      $isActive={$isActive}
      style={{
        backgroundColor: $isActive ? colors.active : colors.textFieldBorder,
      }}
      {...props}
    />
  );
}

interface BooleanControlProps {
  field: CmsFieldBoolean & CmsFieldBase;
  onChange: (...args: unknown[]) => unknown;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  forID?: string;
  value?: boolean;
  hasErrors?: boolean;
  errorListId?: string;
  hintId?: string;
}

export default function BooleanControl({
  value = false,
  forID,
  field,
  onChange,
  classNameWrapper,
  setActiveStyle,
  setInactiveStyle,
  hasErrors,
  errorListId,
  hintId,
}: BooleanControlProps) {
  return (
    <div className={classNameWrapper}>
      <Toggle
        id={forID}
        active={value}
        onChange={onChange}
        onFocus={setActiveStyle}
        onBlur={setInactiveStyle}
        Background={BooleanBackground}
        ariaRequired={field.required !== false}
        ariaInvalid={hasErrors}
        ariaErrorMessage={errorListId}
        ariaDescribedBy={hintId}
      />
    </div>
  );
}

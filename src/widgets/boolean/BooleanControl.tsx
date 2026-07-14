import React from 'react';

import { Toggle, ToggleBackground, colors } from '@/ui/default/index';

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
  field: { get: (key: string, defaultValue?: unknown) => unknown };
  onChange: (...args: unknown[]) => unknown;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  forID?: string;
  value?: boolean;
}

export default function BooleanControl({
  value = false,
  forID,
  onChange,
  classNameWrapper,
  setActiveStyle,
  setInactiveStyle,
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
      />
    </div>
  );
}

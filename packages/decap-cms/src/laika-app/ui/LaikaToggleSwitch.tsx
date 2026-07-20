
import { Switch } from '@base-ui/react/switch';
import styled from '@emotion/styled';
import React from 'react';

import { colors } from '@/ui/default/index';
import { laikaShouldForwardProp } from '@/ui/styled';

/**
 * Accessible toggle switch built on Base UI's `Switch`. Renders a styled
 * track + knob over Base UI's `role="switch"` element (with its hidden
 * native input), so keyboard navigation (Space and Enter), focus
 * management, and form submission come from the primitive. Used for binary
 * preferences (light/dark, beta features, etc.).
 *
 * Pass `checked`/`onCheckedChange` for controlled mode, or just
 * `defaultChecked` for uncontrolled.
 */

export type LaikaToggleSwitchSize = 'md' | 'sm';

const sizeMap: Record<LaikaToggleSwitchSize, { track: string, knob: string, knobMove: string }> = {
  md: { track: '40px', knob: '16px', knobMove: '16px' },
  sm: { track: '32px', knob: '12px', knobMove: '12px' },
};

const Track = styled(Switch.Root, { shouldForwardProp: laikaShouldForwardProp })<{
  $size: LaikaToggleSwitchSize,
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  width: ${({ $size }) => sizeMap[$size].track};
  height: calc(${({ $size }) => sizeMap[$size].knob} + 8px);
  flex-shrink: 0;
  padding: 0;
  border: none;
  background-color: ${colors.textFieldBorder};
  border-radius: 9999px;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &[data-checked] {
    background-color: ${colors.active};
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px ${colors.activeBackground};
  }

  &[data-disabled] {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const Knob = styled(Switch.Thumb, { shouldForwardProp: laikaShouldForwardProp })<{
  $size: LaikaToggleSwitchSize,
}>`
  position: absolute;
  top: 50%;
  left: 4px;
  transform: translateY(-50%);
  width: ${({ $size }) => sizeMap[$size].knob};
  height: ${({ $size }) => sizeMap[$size].knob};
  background-color: ${colors.foreground};
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
  transition: transform 0.15s ease;
  pointer-events: none;

  &[data-checked] {
    transform: translateY(-50%) translateX(${({ $size }) => sizeMap[$size].knobMove});
  }
`;

export interface LaikaToggleSwitchProps extends React.AriaAttributes {
  size?: LaikaToggleSwitchSize;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

function LaikaToggleSwitch({ size = 'md', onCheckedChange, ...rest }: LaikaToggleSwitchProps) {
  return (
    <Track
      $size={size}
      onCheckedChange={onCheckedChange ? (checked: boolean) => onCheckedChange(checked) : undefined}
      {...rest}
    >
      <Knob $size={size} />
    </Track>
  );
}

export default LaikaToggleSwitch;

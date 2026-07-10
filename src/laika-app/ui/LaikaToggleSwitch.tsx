/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';

import { colors } from '../../ui/default/index';
import { laikaShouldForwardProp } from './styled-utils';

/**
 * Accessible toggle switch. Renders a hidden native checkbox underneath a
 * styled track + knob so keyboard navigation, focus management, and form
 * submission behave like a normal `<input type="checkbox">`. Used for
 * binary preferences (light/dark, beta features, etc.).
 *
 * Pass `checked`/`onChange` for controlled mode, or just `defaultChecked`
 * for uncontrolled.
 */

export type LaikaToggleSwitchSize = 'md' | 'sm';

const sizeMap: Record<LaikaToggleSwitchSize, { track: string; knob: string; knobMove: string }> = {
  md: { track: '40px', knob: '16px', knobMove: '20px' },
  sm: { track: '32px', knob: '12px', knobMove: '16px' },
};

const Wrap = styled('label', { shouldForwardProp: laikaShouldForwardProp })<{
  $size: LaikaToggleSwitchSize;
  $disabled?: boolean;
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  width: ${({ $size }) => sizeMap[$size].track};
  height: calc(${({ $size }) => sizeMap[$size].knob} + 8px);
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
`;

const HiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
  margin: 0;
`;

const Track = styled.span<{ $size: LaikaToggleSwitchSize }>`
  display: block;
  width: 100%;
  height: 100%;
  background-color: ${colors.textFieldBorder};
  border-radius: 9999px;
  transition: background-color 0.15s ease;

  input:checked + & {
    background-color: ${colors.active};
  }

  input:focus-visible + & {
    box-shadow: 0 0 0 3px ${colors.activeBackground};
  }
`;

const Knob = styled.span<{ $size: LaikaToggleSwitchSize }>`
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

  input:checked ~ & {
    transform: translateY(-50%) translateX(${({ $size }) => sizeMap[$size].knobMove});
  }
`;

export interface LaikaToggleSwitchProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type'
> {
  size?: LaikaToggleSwitchSize;
}

const LaikaToggleSwitch = React.forwardRef<HTMLInputElement, LaikaToggleSwitchProps>(
  function LaikaToggleSwitch({ size = 'md', disabled, className, style, ...rest }, ref) {
    return (
      <Wrap $size={size} $disabled={disabled} className={className} style={style}>
        <HiddenInput ref={ref} type="checkbox" disabled={disabled} role="switch" {...rest} />
        <Track $size={size} />
        <Knob $size={size} />
      </Wrap>
    );
  },
);

export default LaikaToggleSwitch;

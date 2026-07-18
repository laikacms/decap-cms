import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';

import { laikaShouldForwardProp } from '@/ui/styled';
import { Switch } from '@/ui/Toggle';
import { colors, colorsRaw, shadows, transitions } from './styles';

export interface ToggleActiveProps {
  $isActive?: boolean;
}

const ToggleContainer = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 40px;
  height: 20px;
  cursor: pointer;
  border: none;
  padding: 0;
  margin: 0;
  background: transparent;
`;

const ToggleHandle = styled('span', { shouldForwardProp: laikaShouldForwardProp })<ToggleActiveProps>`
  ${shadows.dropDeep};
  position: absolute;
  left: 0;
  top: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${colorsRaw.white};
  transition: transform ${transitions.main};

  ${(props: ToggleActiveProps) =>
  props.$isActive
  && css`
      transform: translateX(20px);
    `};
`;

const ToggleBackground = styled('span', {
  shouldForwardProp: laikaShouldForwardProp,
})<ToggleActiveProps>`
  width: 34px;
  height: 14px;
  border-radius: 10px;
  background-color: ${colors.active};
`;

export type ToggleContainerComponent = typeof ToggleContainer;
export type ToggleBackgroundComponent = typeof ToggleBackground;
export type ToggleHandleComponent = typeof ToggleHandle;

export interface ToggleProps {
  id?: string;
  active?: boolean;
  onChange?: (isActive: boolean) => void;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  className?: string;
  Container?: React.ComponentType<React.ComponentProps<typeof ToggleContainer>>;
  Background?: React.ComponentType<ToggleActiveProps>;
  Handle?: React.ComponentType<ToggleActiveProps>;
  /** Threaded from the Decap widget layer's validation state onto the
   * underlying switch button (WCAG 2.1 3.3.1 / 3.3.3). */
  ariaRequired?: boolean;
  ariaInvalid?: boolean;
  ariaErrorMessage?: string;
}

/**
 * Controlled on/off toggle built on the shared Base UI `Switch` primitive
 * (see `src/ui/Toggle.tsx`). The `active` prop drives the
 * checked state directly (no internal `useState` seed), so re-rendering with
 * a new `active` value always reflects it, fixing the prop-sync defect
 * (DCMS-543). `Container`/`Background`/`Handle` stay swappable so existing
 * callers (e.g. `BooleanControl`) keep their visual output unchanged.
 */
function Toggle({
  id,
  active = false,
  onChange,
  onFocus,
  onBlur,
  className,
  Container = ToggleContainer,
  Background = ToggleBackground,
  Handle = ToggleHandle,
  ariaRequired,
  ariaInvalid,
  ariaErrorMessage,
}: ToggleProps): React.ReactElement {
  return (
    <Switch
      nativeButton
      id={id}
      checked={active}
      onCheckedChange={onChange}
      onFocus={event => onFocus?.(event as unknown as React.FocusEvent<HTMLButtonElement>)}
      onBlur={event => onBlur?.(event as unknown as React.FocusEvent<HTMLButtonElement>)}
      className={className}
      aria-required={ariaRequired}
      aria-invalid={ariaInvalid || undefined}
      aria-errormessage={ariaInvalid ? ariaErrorMessage : undefined}
      render={<Container />}
    >
      <Background $isActive={active} />
      <Handle $isActive={active} />
    </Switch>
  );
}

const StyledToggle = styled(Toggle)``;

export { StyledToggle as default, ToggleBackground, ToggleContainer, ToggleHandle };

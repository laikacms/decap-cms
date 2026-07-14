import * as React from 'react';

import { css, cx } from './_styled';
import { type ToggleSize, type ToggleVariant, toggleVariants } from './toggle';

const groupClass = css`
  display: flex;
  width: fit-content;
  flex-direction: row;
  align-items: center;
  gap: 0.125rem;
  border-radius: 0.375rem;
  &[data-orientation='vertical'] {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ToggleGroupContext = React.createContext<{
  disabled?: boolean;
  selectedValues: string[];
  size?: ToggleSize;
  toggleValue: (value: string) => void;
  variant?: ToggleVariant;
}>({
  selectedValues: [],
  toggleValue: () => undefined,
  variant: 'default',
  size: 'default',
});

type ToggleGroupBaseProps = Omit<React.ComponentProps<'div'>, 'defaultValue'> & {
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  size?: ToggleSize;
  variant?: ToggleVariant;
};

type ToggleGroupSingleProps = ToggleGroupBaseProps & {
  type?: 'single';
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

type ToggleGroupMultipleProps = ToggleGroupBaseProps & {
  type: 'multiple';
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};

export type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;

export function ToggleGroup({
  className,
  type = 'single',
  value,
  defaultValue,
  onValueChange,
  variant,
  size,
  orientation = 'horizontal',
  disabled,
  children,
  ...props
}: ToggleGroupProps): React.ReactNode {
  const normalize = React.useCallback(
    (nextValue: string | string[] | undefined): string[] =>
      type === 'multiple'
        ? Array.isArray(nextValue)
          ? nextValue
          : []
        : typeof nextValue === 'string' && nextValue
          ? [nextValue]
          : [],
    [type],
  );
  const [internalValues, setInternalValues] = React.useState(() => normalize(defaultValue));
  const selectedValues = value === undefined ? internalValues : normalize(value);

  const toggleValue = (itemValue: string) => {
    const isSelected = selectedValues.includes(itemValue);
    const nextValues =
      type === 'multiple'
        ? isSelected
          ? selectedValues.filter(current => current !== itemValue)
          : [...selectedValues, itemValue]
        : isSelected
          ? []
          : [itemValue];

    if (value === undefined) setInternalValues(nextValues);
    if (type === 'multiple') {
      (onValueChange as ToggleGroupMultipleProps['onValueChange'])?.(nextValues);
    } else {
      (onValueChange as ToggleGroupSingleProps['onValueChange'])?.(nextValues[0] ?? '');
    }
  };

  return (
    <div
      role="group"
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-orientation={orientation}
      className={cx(groupClass, className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ disabled, selectedValues, size, toggleValue, variant }}>
        {children}
      </ToggleGroupContext.Provider>
    </div>
  );
}

export function ToggleGroupItem({
  className,
  children,
  value,
  variant = 'default',
  size = 'default',
  disabled,
  onClick,
  ...props
}: React.ComponentProps<'button'> & {
  value: string;
  variant?: ToggleVariant;
  size?: ToggleSize;
}): React.ReactNode {
  const context = React.useContext(ToggleGroupContext);
  const isPressed = context.selectedValues.includes(value);
  return (
    <button
      type="button"
      data-slot="toggle-group-item"
      data-state={isPressed ? 'on' : 'off'}
      aria-pressed={isPressed}
      disabled={context.disabled || disabled}
      className={toggleVariants({
        variant: context.variant ?? variant,
        size: context.size ?? size,
        className,
      })}
      onClick={event => {
        onClick?.(event);
        if (!event.defaultPrevented) context.toggleValue(value);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

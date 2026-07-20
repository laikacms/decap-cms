
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import * as React from 'react';

import { css } from './styled';
import { type ToggleSize, type ToggleVariant, toggleVariants } from './Toggle';

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
  size?: ToggleSize,
  variant?: ToggleVariant,
}>({
  variant: 'default',
  size: 'default',
});

type ToggleGroupBaseProps = Omit<React.ComponentProps<'div'>, 'defaultValue'> & {
  disabled?: boolean,
  orientation?: 'horizontal' | 'vertical',
  size?: ToggleSize,
  variant?: ToggleVariant,
};

type ToggleGroupSingleProps = ToggleGroupBaseProps & {
  type?: 'single',
  value?: string,
  defaultValue?: string,
  onValueChange?: (value: string) => void,
};

type ToggleGroupMultipleProps = ToggleGroupBaseProps & {
  type: 'multiple',
  value?: string[],
  defaultValue?: string[],
  onValueChange?: (value: string[]) => void,
};

export type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;

function toArrayValue(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

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
  const contextValue = React.useMemo(() => ({ size, variant }), [size, variant]);

  return (
    <ToggleGroupPrimitive
      multiple={type === 'multiple'}
      value={toArrayValue(value)}
      defaultValue={toArrayValue(defaultValue)}
      onValueChange={(groupValue: string[]) => {
        if (type === 'multiple') {
          (onValueChange as ToggleGroupMultipleProps['onValueChange'])?.(groupValue);
        } else {
          (onValueChange as ToggleGroupSingleProps['onValueChange'])?.(groupValue[0] ?? '');
        }
      }}
      disabled={disabled}
      orientation={orientation}
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      css={groupClass}
      className={className}
      {...props}
    >
      <ToggleGroupContext.Provider value={contextValue}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}

export function ToggleGroupItem({
  className,
  children,
  value,
  variant = 'default',
  size = 'default',
  ...props
}: React.ComponentProps<'button'> & {
  value: string,
  variant?: ToggleVariant,
  size?: ToggleSize,
}): React.ReactNode {
  const context = React.useContext(ToggleGroupContext);
  return (
    <TogglePrimitive
      value={value}
      data-slot="toggle-group-item"
      css={toggleVariants({
        variant: context.variant ?? variant,
        size: context.size ?? size,
      })}
      className={className}
      {...props}
    >
      {children}
    </TogglePrimitive>
  );
}

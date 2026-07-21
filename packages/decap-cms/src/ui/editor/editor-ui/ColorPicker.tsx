/**
 * Color-picker popover for the richtext toolbar's text-color / background-color
 * controls.
 *
 * Built on the shared `Popover` primitive (portal + outside-click / Escape
 * handling already implemented there) and `react-colorful` for the actual
 * hue/saturation/alpha picking surface. `react-colorful` doesn't expose the
 * hue and alpha sliders as standalone components, so `ColorPickerArea` mounts
 * the whole `HexAlphaColorPicker` widget (which renders a saturation area, a
 * hue slider and an alpha slider, each keyboard-operable via arrow keys) and
 * `ColorPickerHueSlider` / `ColorPickerAlphaSlider` stay no-ops to avoid
 * rendering duplicate controls.
 */
import * as React from 'react';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { HexAlphaColorPicker, HexColorInput } from 'react-colorful';

import { css } from '@/ui/styled';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';

interface ColorPickerStore {
  value: string;
  setValue: (value: string) => void;
}

const ColorPickerContext = createContext<ColorPickerStore | null>(null);

function useColorPickerStore(): ColorPickerStore {
  const store = useContext(ColorPickerContext);
  if (!store) throw new Error('useColorPicker must be used inside <ColorPicker>');
  return store;
}

interface RootProps {
  value?: string;
  defaultValue?: string;
  defaultFormat?: string;
  modal?: boolean;
  onValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

function ColorPickerRoot({
  value,
  defaultValue = '#000000',
  modal,
  onValueChange,
  onOpenChange,
  children,
}: RootProps): ReactNode {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const setValue = useCallback(
    (next: string) => {
      setInternal(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );
  const store = useMemo(() => ({ value: current, setValue }), [current, setValue]);
  return (
    <ColorPickerContext.Provider value={store}>
      <Popover modal={modal} onOpenChange={onOpenChange}>
        {children}
      </Popover>
    </ColorPickerContext.Provider>
  );
}

function ColorPickerTrigger({
  asChild,
  children,
}: {
  children?: ReactNode,
  asChild?: boolean,
}): ReactNode {
  if (asChild && React.isValidElement(children)) {
    return <PopoverTrigger render={children} />;
  }
  return <PopoverTrigger>{children}</PopoverTrigger>;
}

const contentClass = css`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: auto;
`;

function ColorPickerContent({ children }: { children?: ReactNode }): ReactNode {
  return (
    <PopoverContent align="start" sideOffset={8} css={contentClass}>
      {children}
    </PopoverContent>
  );
}

const areaClass = css`
  .react-colorful {
    width: 200px;
    height: 160px;
  }
`;

function ColorPickerArea(): ReactNode {
  const { value, setValue } = useColorPickerStore();
  return (
    <div css={areaClass}>
      <HexAlphaColorPicker color={value} onChange={setValue} />
    </div>
  );
}

function ColorPickerHueSlider(): ReactNode {
  return null;
}
function ColorPickerAlphaSlider(): ReactNode {
  return null;
}
function ColorPickerSwatch(): ReactNode {
  return null;
}
function ColorPickerEyeDropper(): ReactNode {
  return null;
}
function ColorPickerFormatSelect(): ReactNode {
  return null;
}

const hexRowClass = css`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
`;

function ColorPickerInput(): ReactNode {
  const { value, setValue } = useColorPickerStore();
  return (
    <div css={hexRowClass}>
      <span aria-hidden="true">Hex</span>
      <HexColorInput
        aria-label="Hex color value"
        color={value}
        onChange={setValue}
        prefixed
        alpha
        style={{
          flex: 1,
          minWidth: 0,
          borderRadius: '0.25rem',
          border: '1px solid rgba(127, 127, 127, 0.35)',
          padding: '0.25rem 0.5rem',
          font: 'inherit',
        }}
      />
    </div>
  );
}

export {
  ColorPickerAlphaSlider,
  ColorPickerAlphaSlider as AlphaSlider,
  ColorPickerArea,
  ColorPickerArea as Area,
  ColorPickerContent,
  ColorPickerContent as Content,
  ColorPickerEyeDropper,
  ColorPickerEyeDropper as EyeDropper,
  ColorPickerFormatSelect,
  ColorPickerFormatSelect as FormatSelect,
  ColorPickerHueSlider,
  ColorPickerHueSlider as HueSlider,
  ColorPickerInput,
  ColorPickerInput as Input,
  ColorPickerRoot as ColorPicker,
  ColorPickerRoot as Root,
  ColorPickerSwatch,
  ColorPickerSwatch as Swatch,
  ColorPickerTrigger,
  ColorPickerTrigger as Trigger,
  useColorPickerStore as useColorPicker,
};

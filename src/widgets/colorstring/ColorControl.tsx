import React from 'react';
import styled from '@emotion/styled';
import { HexColorPicker, RgbaStringColorPicker } from 'react-colorful';
import tinycolor from 'tinycolor2';

import { zIndex } from '@/ui/default/index';

function ClearIcon() {
  return (
    <svg height="20" width="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        fill="rgb(122, 130, 145)"
        d="M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z"
      ></path>
    </svg>
  );
}

const ClearButton = styled.div`
  position: absolute;
  right: 6px;
  z-index: ${zIndex.zIndex1000};
  padding: 8px;
  margin-top: 11px;
`;

const ClearButtonWrapper = styled.div`
  position: relative;
  width: 100%;
`;

// color swatch background with checkerboard to display behind transparent colors
const ColorSwatchBackground = styled.div`
  position: absolute;
  z-index: ${zIndex.zIndex1};
  background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==');
  height: 38px;
  width: 48px;
  margin-top: 10px;
  margin-left: 10px;
  border-radius: 5px;
`;

const ColorSwatch = styled.div<{ background?: string; color?: string }>`
  position: absolute;
  z-index: ${zIndex.zIndex2};
  background: ${props => props.background};
  cursor: pointer;
  height: 38px;
  width: 48px;
  margin-top: 10px;
  margin-left: 10px;
  border-radius: 5px;
  border: 2px solid rgb(223, 223, 227);
  text-align: center;
  font-size: 27px;
  line-height: 1;
  padding-top: 4px;
  user-select: none;
  color: ${props => props.color};
`;

const ColorPickerContainer = styled.div`
  position: absolute;
  z-index: ${zIndex.zIndex1000};
  margin-top: 48px;
  margin-left: 12px;
`;

// fullscreen div to close color picker when clicking outside of picker
const ClickOutsideDiv = styled.div`
  position: fixed;
  inset: 0;
`;

interface ColorControlProps {
  onChange: (...args: unknown[]) => unknown;
  forID?: string;
  value?: string;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  field: Record<string, unknown>;
}

export default function ColorControl({
  forID,
  value = '',
  field,
  onChange,
  classNameWrapper,
  setActiveStyle,
  setInactiveStyle,
}: ColorControlProps) {
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  function handleClick() {
    setShowColorPicker(prev => !prev);
  }

  function handleClear() {
    onChange('');
  }

  function handleClose() {
    setShowColorPicker(false);
  }

  const enableAlpha = Boolean(field.enableAlpha ?? false);

  function handleChange(color: string) {
    if (!enableAlpha) {
      onChange(color);
      return;
    }
    const parsed = tinycolor(color);
    onChange(parsed.getAlpha() < 1 ? parsed.toRgbString() : parsed.toHexString());
  }

  const allowInput = field.allowInput ?? false;
  const showClearButton = !allowInput && value;

  const parsedValue = tinycolor(value);
  const pickerColor = enableAlpha
    ? parsedValue.isValid()
      ? parsedValue.toRgbString()
      : 'rgba(0, 0, 0, 1)'
    : parsedValue.isValid()
      ? parsedValue.toHexString()
      : '#000000';

  return (
    <>
      {' '}
      {showClearButton && (
        <ClearButtonWrapper>
          <ClearButton
            role="button"
            tabIndex={0}
            aria-label="Clear color value"
            onClick={handleClear}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleClear();
              }
            }}
          >
            <ClearIcon />
          </ClearButton>
        </ClearButtonWrapper>
      )}
      <ColorSwatchBackground />
      <ColorSwatch
        background={tinycolor(value).isValid() ? value : '#fff'}
        color={tinycolor(value).isValid() ? 'rgba(255, 255, 255, 0)' : 'rgb(223, 223, 227)'}
        role="button"
        tabIndex={0}
        aria-label="Open color picker"
        onClick={handleClick}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick();
          }
        }}
      >
        ?
      </ColorSwatch>
      {showColorPicker && (
        <ColorPickerContainer>
          <ClickOutsideDiv onClick={handleClose} />
          {enableAlpha ? (
            <RgbaStringColorPicker color={pickerColor} onChange={handleChange} />
          ) : (
            <HexColorPicker color={pickerColor} onChange={handleChange} />
          )}
        </ColorPickerContainer>
      )}
      <input
        type="text"
        id={forID}
        className={classNameWrapper}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onFocus={setActiveStyle}
        onBlur={setInactiveStyle}
        style={{
          paddingLeft: '75px',
          paddingRight: '70px',
          color: !allowInput ? '#bbb' : undefined,
        }}
        onClick={!allowInput ? handleClick : undefined}
        readOnly={!allowInput}
      />
    </>
  );
}

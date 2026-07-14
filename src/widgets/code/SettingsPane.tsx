import React from 'react';
import styled from '@emotion/styled';
import Select from 'react-select';

import { text, shadows, zIndex } from '@/ui/default/index';
import { isHotkey } from '@/lib/util/index';
import SettingsButton from './SettingsButton';
import languageSelectStyles from './languageSelectStyles';

interface SelectOption {
  value: string;
  label: string;
}

const SettingsPaneContainer = styled.div`
  position: absolute;
  right: 0;
  width: 200px;
  z-index: ${zIndex.zIndex10};
  height: 100%;
  background-color: #fff;
  overflow: hidden;
  overflow-y: scroll;
  padding: 12px;
  border-radius: 0 3px 3px 0;
  ${shadows.drop};
`;

const SettingsFieldLabel = styled.label`
  ${text.fieldLabel};
  font-size: 11px;
  display: block;
  margin-top: 8px;
  margin-bottom: 2px;
`;

const SettingsSectionTitle = styled.h3`
  font-size: 14px;
  margin-top: 14px;
  margin-bottom: 0;

  &:first-of-type {
    margin-top: 4px;
  }
`;

interface SettingsSelectProps {
  value: SelectOption;
  options: SelectOption[];
  onChange: (value: string) => void;
  forID: string;
  type: string;
  autoFocus?: boolean;
}

function SettingsSelect({ value, options, onChange, forID, type, autoFocus }: SettingsSelectProps) {
  return (
    <Select<SelectOption>
      inputId={`${forID}-select-${type}`}
      styles={languageSelectStyles}
      value={value}
      options={options}
      onChange={opt => onChange(opt!.value)}
      menuPlacement="auto"
      captureMenuScroll={false}
      autoFocus={autoFocus}
    />
  );
}

interface SettingsPaneProps {
  hideSettings: () => void;
  forID: string;
  modes: SelectOption[];
  mode: SelectOption;
  theme: string;
  themes: string[] | null;
  keyMap: SelectOption;
  keyMaps: SelectOption[];
  allowLanguageSelection: boolean;
  onChangeLang: (value: string) => void;
  onChangeTheme: (value: string) => void;
  onChangeKeyMap: (value: string) => void;
}

function SettingsPane({
  hideSettings,
  forID,
  modes,
  mode,
  theme,
  themes,
  keyMap,
  keyMaps,
  allowLanguageSelection,
  onChangeLang,
  onChangeTheme,
  onChangeKeyMap,
}: SettingsPaneProps) {
  return (
    <SettingsPaneContainer
      onKeyDown={e => {
        const nativeEvent = e.nativeEvent;
        if (isHotkey('esc', nativeEvent as unknown as Record<string, unknown>)) {
          hideSettings();
        }
      }}
    >
      <SettingsButton onClick={hideSettings} showClose={true} />
      {allowLanguageSelection && (
        <>
          <SettingsSectionTitle>Field Settings</SettingsSectionTitle>
          <SettingsFieldLabel htmlFor={`${forID}-select-mode`}>Mode</SettingsFieldLabel>
          <SettingsSelect
            type="mode"
            forID={forID}
            value={mode}
            options={modes}
            onChange={onChangeLang}
            autoFocus
          />
        </>
      )}
      <>
        <SettingsSectionTitle>Global Settings</SettingsSectionTitle>
        {themes && (
          <>
            <SettingsFieldLabel htmlFor={`${forID}-select-theme`}>Theme</SettingsFieldLabel>
            <SettingsSelect
              type="theme"
              forID={forID}
              value={{ value: theme, label: theme }}
              options={themes.map((t: string) => ({ value: t, label: t }))}
              onChange={onChangeTheme}
              autoFocus={!allowLanguageSelection}
            />
          </>
        )}
        <SettingsFieldLabel htmlFor={`${forID}-select-keymap`}>KeyMap</SettingsFieldLabel>
        <SettingsSelect
          type="keymap"
          forID={forID}
          value={keyMap}
          options={keyMaps}
          onChange={onChangeKeyMap}
        />
      </>
    </SettingsPaneContainer>
  );
}

export default SettingsPane;

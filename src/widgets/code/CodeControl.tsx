import React from 'react';
import { ClassNames } from '@emotion/react';
import CodeMirror, { EditorView, keymap } from '@uiw/react-codemirror';
import { material } from '@uiw/codemirror-theme-material';
import { emacs } from '@replit/codemirror-emacs';
import { vim } from '@replit/codemirror-vim';
import { vscodeKeymap } from '@replit/codemirror-vscode-keymap';

import SettingsPane from './SettingsPane';
import SettingsButton from './SettingsButton';
import languageData from './data/languages.json';
import { getLanguageExtension } from './languageLoaders';

import type { Extension, ReactCodeMirrorRef } from '@uiw/react-codemirror';
import type { CmsFieldBase, CmsFieldCode } from '../lib-util/index';

interface LanguageInfo {
  label: string;
  name: string;
  identifiers: string[];
}

const languages: LanguageInfo[] = languageData.map(lang => ({
  label: lang.label,
  name: lang.identifiers[0],
  identifiers: lang.identifiers,
}));

const styleString = `
  padding: 0;
`;

const defaultLang = { name: '', label: 'none' };

interface SelectOption {
  value: string;
  label: string;
}

function valueToOption(val: string | { name: string; label?: string }): SelectOption {
  if (typeof val === 'string') {
    return { value: val, label: val };
  }
  return { value: val.name, label: val.label || val.name };
}

const modes = languages.map(valueToOption);

const themes = ['default', 'material'];

const settingsPersistKeys: Record<string, string> = {
  theme: 'cms.codemirror.theme',
  keyMap: 'cms.codemirror.keymap',
};

function getLanguageByName(name: string): LanguageInfo | undefined {
  return languages.find(lang => lang.name === name);
}

function getKeyMapOptions(): SelectOption[] {
  return ['emacs', 'vim', 'vscode', 'default']
    .sort()
    .map(keyMap => ({ value: keyMap, label: keyMap }));
}

interface CodeControlProps {
  field: CmsFieldBase & CmsFieldCode;
  onChange: (...args: unknown[]) => unknown;
  value?: Record<string, unknown> | string;
  forID: string;
  classNameWrapper: string;
  widget: Record<string, unknown>;
  isParentListCollapsed?: boolean;
  isEditorComponent?: boolean;
  isNewEditorComponent?: boolean;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
}

function getKeys(
  field: CmsFieldBase & CmsFieldCode,
  isEditorComponent: boolean | undefined,
): Record<string, string> {
  const defaults: Record<string, string> = { code: 'code', lang: 'lang' };
  if (isEditorComponent) return defaults;
  const keys = field.keys as Record<string, unknown> as Record<string, string>;
  return { ...defaults, ...keys };
}

function valueIsMap(
  field: CmsFieldBase & CmsFieldCode,
  isEditorComponent: boolean | undefined,
): boolean {
  return !field.output_code_only || !!isEditorComponent;
}

export default function CodeControl({
  field,
  onChange,
  value,
  forID,
  classNameWrapper,
  widget,
  isParentListCollapsed,
  isEditorComponent,
  isNewEditorComponent,
  setActiveStyle,
  setInactiveStyle,
}: CodeControlProps) {
  const cmRef = React.useRef<ReactCodeMirrorRef>(null);
  const keys = React.useMemo(() => getKeys(field, isEditorComponent), [field, isEditorComponent]);
  const isMap = valueIsMap(field, isEditorComponent);
  const allowLanguageSelection = field.allow_language_selection ?? true;

  const initialLang =
    (isMap && value && (value as Record<string, unknown>)?.[keys.lang]) || field.default_language;

  const [lang, setLang] = React.useState<string>('');
  const [keyMap, setKeyMap] = React.useState<string>(
    () => localStorage.getItem(settingsPersistKeys['keyMap']) || 'default',
  );
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [theme, setTheme] = React.useState<string>(
    () => localStorage.getItem(settingsPersistKeys['theme']) || themes[themes.length - 1],
  );
  const [lastKnownValue, setLastKnownValue] = React.useState<unknown>(
    isMap ? (value as Record<string, unknown>)?.[keys.code] : value,
  );

  const initialLangRef = React.useRef(initialLang);
  React.useEffect(() => {
    setLang((initialLangRef.current as string) || '');
  }, []);

  function toValue(type: string, val: unknown) {
    if (isMap) {
      // Return a new map with the updated key. `value` is undefined for a new
      // entry, so spread defensively rather than mutating it in place.
      return { ...(value as Record<string, unknown> | undefined), [keys[type]]: val };
    }
    return type === 'code' ? val : value;
  }

  // Persist theme/keyMap selections so they apply across fields and sessions.
  React.useEffect(() => {
    localStorage.setItem(settingsPersistKeys['theme'], theme);
  }, [theme]);
  React.useEffect(() => {
    localStorage.setItem(settingsPersistKeys['keyMap'], keyMap);
  }, [keyMap]);

  // The first language change is the initial value being applied, so it is not
  // written back through onChange — only subsequent user selections are.
  const prevLangRef = React.useRef(lang);
  const langInitializedRef = React.useRef(false);
  React.useEffect(() => {
    if (prevLangRef.current === lang) {
      return;
    }
    prevLangRef.current = lang;
    const isInitialLangChange = !langInitializedRef.current;
    langInitializedRef.current = true;
    if (!isInitialLangChange && isMap) {
      onChange(toValue('lang', lang));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onChange/toValue are stable enough here
  }, [lang]);

  // CodeMirror 6 lays out reactively, but a collapsed parent list hides the
  // editor with zero height; re-measure once it becomes visible again.
  React.useEffect(() => {
    if (!isParentListCollapsed) {
      cmRef.current?.view?.requestMeasure();
    }
  }, [isParentListCollapsed]);

  function handleChange(newValue: string) {
    setLastKnownValue(newValue);
    onChange(toValue('code', newValue));
  }

  function showSettings() {
    setSettingsVisible(true);
  }

  function hideSettings() {
    setSettingsVisible(prev => (prev ? false : prev));
    cmRef.current?.view?.focus();
  }

  function handleFocus() {
    hideSettings();
    setActiveStyle();
  }

  function handleBlur() {
    setInactiveStyle();
  }

  // The focus/blur DOM handlers are wired into CodeMirror as an extension.
  // Route through refs so the extension list only changes with lang/keyMap.
  const focusHandlerRef = React.useRef(handleFocus);
  const blurHandlerRef = React.useRef(handleBlur);
  focusHandlerRef.current = handleFocus;
  blurHandlerRef.current = handleBlur;

  const extensions = React.useMemo<Extension[]>(() => {
    const exts: Extension[] = [
      EditorView.domEventHandlers({
        focus: () => {
          focusHandlerRef.current();
          return false;
        },
        blur: () => {
          blurHandlerRef.current();
          return false;
        },
      }),
    ];
    const langInfo = getLanguageByName(lang);
    if (langInfo) {
      const langExtension = getLanguageExtension(langInfo.identifiers);
      if (langExtension) {
        exts.push(langExtension);
      }
    }
    if (keyMap === 'emacs') {
      exts.push(emacs());
    } else if (keyMap === 'vim') {
      exts.push(vim());
    } else if (keyMap === 'vscode') {
      exts.push(keymap.of(vscodeKeymap));
    }
    return exts;
  }, [lang, keyMap]);

  const langInfo = getLanguageByName(lang);
  const codeMirrorConfig = (widget.codeMirrorConfig || {}) as Record<string, unknown>;
  const lineNumbers = codeMirrorConfig.lineNumbers !== false;

  return (
    <ClassNames>
      {({ css, cx }) => (
        <div
          className={cx(
            classNameWrapper,
            css`
              ${styleString};
            `,
          )}
        >
          {!settingsVisible && <SettingsButton onClick={showSettings} showClose={false} />}
          {settingsVisible && (
            <SettingsPane
              hideSettings={hideSettings}
              forID={forID}
              modes={modes}
              mode={valueToOption(langInfo || defaultLang)}
              theme={themes.find(t => t === theme) || theme}
              themes={themes}
              keyMap={{ value: keyMap, label: keyMap }}
              keyMaps={getKeyMapOptions()}
              allowLanguageSelection={allowLanguageSelection}
              onChangeLang={(newLang: string) => setLang(newLang)}
              onChangeTheme={(newTheme: string) => setTheme(newTheme)}
              onChangeKeyMap={(newKeyMap: string) => setKeyMap(newKeyMap)}
            />
          )}
          <CodeMirror
            ref={cmRef}
            className={css`
              height: 100%;
              border-radius: 0 3px 3px;
              overflow: hidden;

              .cm-editor {
                cursor: text;
              }
            `}
            value={(lastKnownValue as string) || ''}
            theme={theme === 'material' ? material : 'light'}
            extensions={extensions}
            minHeight="300px"
            autoFocus={isNewEditorComponent}
            basicSetup={{ lineNumbers }}
            onChange={handleChange}
          />
        </div>
      )}
    </ClassNames>
  );
}

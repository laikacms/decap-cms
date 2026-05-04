import React from 'react';
import { ClassNames } from '@emotion/react';
import uniq from 'lodash/uniq';
import isEmpty from 'lodash/isEmpty';
import { v4 as uuid } from 'uuid';
import { UnControlled as ReactCodeMirror } from 'react-codemirror2';

import SettingsPane from './SettingsPane';
import SettingsButton from './SettingsButton';
import languageData from '../data/languages.json';
import { getLanguageLoader } from './languageLoaders';

import type { CmsFieldBase, CmsFieldCode } from 'decap-cms-lib-util';

type CodeMirrorEditor = {
  getWrapperElement: () => HTMLElement;
  refresh: () => void;
  focus: () => void;
  doc: {
    getCursor: () => unknown;
    setCursor: (cursor: unknown) => void;
    listSelections: () => unknown[];
    setSelections: (selections: unknown[]) => void;
  };
};

interface ChangedProps {
  [key: string]: unknown;
  lang?: string;
  theme?: string;
  keyMap?: string;
}

function getChangedProps(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
  keys?: string[],
): ChangedProps | undefined {
  const propNames = keys || uniq([...Object.keys(previous), ...Object.keys(next)]);
  const changedProps = propNames.reduce((acc: ChangedProps, prop: string) => {
    if (previous[prop] !== next[prop]) {
      acc[prop] = next[prop];
    }
    return acc;
  }, {});
  if (!isEmpty(changedProps)) {
    return changedProps;
  }
}

interface LanguageInfo {
  label: string;
  name: string;
  mode: string;
  mimeType: string;
}

const languages: LanguageInfo[] = languageData.map(lang => ({
  label: lang.label,
  name: lang.identifiers[0],
  mode: lang.codemirror_mode,
  mimeType: lang.codemirror_mime_type,
}));

const styleString = `
  padding: 0;
`;

const defaultLang = { name: '', mode: '', label: 'none' };

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
  return ['emacs', 'vim', 'sublime', 'default']
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
  const cmRef = React.useRef<CodeMirrorEditor | null>(null);
  const keys = React.useMemo(() => getKeys(field, isEditorComponent), [field, isEditorComponent]);
  const isMap = valueIsMap(field, isEditorComponent);
  const allowLanguageSelection = field.allow_language_selection ?? true;

  const initialLang =
    (isMap && value && (value as Record<string, unknown>)?.[keys.lang]) || field.default_language;

  const [isLangInitialized, setIsLangInitialized] = React.useState(false);
  const [lang, setLang] = React.useState<string>('');
  const [keyMap, setKeyMap] = React.useState<string>(
    () => localStorage.getItem(settingsPersistKeys['keyMap']) || 'default',
  );
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [codeMirrorKey, setCodeMirrorKey] = React.useState<string>(() => uuid());
  const [theme, setTheme] = React.useState<string>(
    () => localStorage.getItem(settingsPersistKeys['theme']) || themes[themes.length - 1],
  );
  const [lastKnownValue, setLastKnownValue] = React.useState<unknown>(
    isMap ? (value as Record<string, unknown>)?.[keys.code] : value,
  );

  const initialLangRef = React.useRef(initialLang);
  React.useEffect(() => {
    setLang((initialLangRef.current as string) || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- componentDidMount semantics
  }, []);

  // Track previous codeMirror-relevant state to drive componentDidUpdate logic.
  const prevCmStateRef = React.useRef({ lang, theme, keyMap });

  // Visibility tracking for collapsed-list refresh.
  const visibilityRef = React.useRef({
    isInvisibleOnInit: isParentListCollapsed === true,
    isRefreshedAfterInvisible: false,
  });

  function toValue(type: string, val: unknown) {
    if (isMap) {
      return ((value as Record<string, unknown>)[keys[type]] = val);
    }
    return type === 'code' ? val : value;
  }

  async function handleChangeCodeMirrorProps(changedProps: ChangedProps, ignoreLangChange = false) {
    if (changedProps.lang) {
      const { mode } = getLanguageByName(changedProps.lang) || {};
      if (mode) {
        const loader = getLanguageLoader(mode);
        if (loader) {
          try {
            await loader();
          } catch (e) {
            console.warn(`Failed to load CodeMirror mode: ${mode}`, e);
          }
        }
      }
    }

    // Changing CodeMirror props requires re-initializing the
    // detached/uncontrolled React CodeMirror component, so we save and restore
    // selection/cursor across the re-mount.
    const cm = cmRef.current;
    if (cm) {
      const cursor = cm.doc.getCursor();
      const selections = cm.doc.listSelections();
      setCodeMirrorKey(uuid());
      // After remount via key change, restore selection in editorDidMount.
      pendingRestoreRef.current = { cursor, selections };
    }

    for (const key of ['theme', 'keyMap']) {
      if (changedProps[key]) {
        localStorage.setItem(settingsPersistKeys[key], changedProps[key] as string);
      }
    }

    if (changedProps.lang && !ignoreLangChange && isMap) {
      onChange(toValue('lang', changedProps.lang));
    }
  }

  const pendingRestoreRef = React.useRef<{ cursor: unknown; selections: unknown[] } | null>(null);

  // Latest handleChangeCodeMirrorProps via ref so the prop-change effect can
  // call it without needing it in deps.
  const handleChangePropsRef = React.useRef(handleChangeCodeMirrorProps);
  handleChangePropsRef.current = handleChangeCodeMirrorProps;

  React.useEffect(() => {
    const prev = prevCmStateRef.current;
    const next = { lang, theme, keyMap };
    const changedProps = getChangedProps(
      prev as unknown as Record<string, unknown>,
      next as unknown as Record<string, unknown>,
      ['lang', 'theme', 'keyMap'],
    );
    prevCmStateRef.current = next;
    if (changedProps) {
      const shouldIgnoreLangChange =
        !isLangInitialized && !!changedProps.lang && Object.keys(changedProps).length === 1;
      setIsLangInitialized(true);
      handleChangePropsRef.current(changedProps, shouldIgnoreLangChange);
    }
  }, [lang, theme, keyMap, isLangInitialized]);

  React.useEffect(() => {
    if (
      visibilityRef.current.isInvisibleOnInit &&
      !visibilityRef.current.isRefreshedAfterInvisible &&
      !isParentListCollapsed
    ) {
      const cm = cmRef.current;
      if (cm?.getWrapperElement().offsetHeight) {
        cm.refresh();
        visibilityRef.current.isRefreshedAfterInvisible = true;
      }
    }
  }, [isParentListCollapsed]);

  function handleChange(newValue: string) {
    const cm = cmRef.current!;
    const cursor = cm.doc.getCursor();
    const selections = cm.doc.listSelections();
    setLastKnownValue(newValue);
    onChange(toValue('code', newValue), { cursor, selections });
  }

  function showSettings() {
    setSettingsVisible(true);
  }

  function hideSettings() {
    setSettingsVisible(prev => (prev ? false : prev));
    cmRef.current?.focus();
  }

  function handleFocus() {
    hideSettings();
    setActiveStyle();
  }

  function handleBlur() {
    setInactiveStyle();
  }

  const langInfo = getLanguageByName(lang);
  const mode = langInfo?.mimeType || langInfo?.mode;
  const codeMirrorConfig = (widget.codeMirrorConfig || {}) as Record<string, unknown>;

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
          <ReactCodeMirror
            key={codeMirrorKey}
            className={css`
              height: 100%;
              border-radius: 0 3px 3px;
              overflow: hidden;

              .CodeMirror {
                height: auto !important;
                cursor: text;
                min-height: 300px;
              }

              .CodeMirror-scroll {
                min-height: 300px;
              }
            `}
            options={{
              lineNumbers: true,
              ...codeMirrorConfig,
              extraKeys: {
                'Shift-Tab': 'indentLess',
                Tab: 'indentMore',
                ...((codeMirrorConfig.extraKeys as Record<string, string>) || {}),
              },
              theme,
              mode,
              keyMap,
              viewportMargin: Infinity,
            }}
            detach={true}
            editorDidMount={(cm: CodeMirrorEditor) => {
              cmRef.current = cm;
              // Restore cursor/selection if we just remounted via key change.
              const pending = pendingRestoreRef.current;
              if (pending) {
                cm.doc.setCursor(pending.cursor);
                cm.doc.setSelections(pending.selections);
                pendingRestoreRef.current = null;
              }
              if (isNewEditorComponent) {
                handleFocus();
              }
            }}
            value={lastKnownValue as string}
            onChange={(_editor: unknown, _data: unknown, newValue: string) =>
              handleChange(newValue)
            }
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>
      )}
    </ClassNames>
  );
}

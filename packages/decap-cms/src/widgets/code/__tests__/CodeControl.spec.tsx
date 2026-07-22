/**
 * Unit tests for the code widget's top-level control, CodeControl (DCMS-1387).
 *
 * CodeControl had zero direct test coverage even though it owns real logic:
 * `valueToOption`/`getLanguageByName`/`getKeyMapOptions`, the language/theme
 * dropdown wiring that feeds CodeMirrorEditor, and localStorage-backed
 * theme/keymap persistence via `settingsPersistKeys`. CodeMirrorEditor is
 * mocked so this stays a fast render/interaction test rather than an e2e
 * CodeMirror test (ROADMAP T2 guidance, matching CodeMirrorEditor.spec.tsx's
 * sibling specs).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CodeControl from '@/widgets/code/CodeControl';
import { materialTheme } from '@/widgets/code/materialTheme';

import type { CmsFieldBase } from '@/lib/util/index';
import type { CmsFieldCode } from '@/lib/util/index';
import type { CodeControlProps } from '@/widgets/code/CodeControl';
import type { CodeMirrorEditorRef } from '@/widgets/code/CodeMirrorEditor';

const THEME_KEY = 'cms.codemirror.theme';
const KEYMAP_KEY = 'cms.codemirror.keymap';

const codeMirrorEditorMock = vi.fn();

vi.mock('@/widgets/code/CodeMirrorEditor', () => ({
  default: React.forwardRef<CodeMirrorEditorRef, Record<string, unknown>>(
    function MockCodeMirrorEditor(props, ref) {
      codeMirrorEditorMock(props);
      React.useImperativeHandle(ref, () => ({ view: null }));
      return <div data-testid="codemirror-editor-stub" />;
    },
  ),
}));

// The real loader dynamically imports @codemirror/language-data grammars;
// stub it with a synchronous, distinguishable marker per language so
// extension wiring can be asserted without waiting on real chunk loads.
vi.mock('@/widgets/code/languageLoaders', () => ({
  getLanguageExtension: vi.fn(async (identifiers: string[]) => ({ __mockLanguageExtension: identifiers[0] })),
}));

// Keep the keymap resolution synchronous and side-effect free for the same
// reason; only 'default' matters to these tests (built-in keymap, no chunk).
vi.mock('@/widgets/code/keymapLoaders', () => ({
  getKeymapExtension: vi.fn(async (keyMap: string) => (keyMap === 'default' ? null : { __mockKeymapExtension: keyMap })),
}));

function baseField(overrides: Partial<CmsFieldBase & CmsFieldCode> = {}): CmsFieldBase & CmsFieldCode {
  return { name: 'snippet', widget: 'code', ...overrides };
}

function renderControl(overrides: Partial<CodeControlProps> = {}) {
  const onChange = overrides.onChange ?? vi.fn();
  const props: CodeControlProps = {
    field: baseField(),
    onChange,
    forID: 'snippet-field',
    classNameWrapper: 'wrapper',
    widget: {},
    setActiveStyle: vi.fn(),
    setInactiveStyle: vi.fn(),
    ...overrides,
  };
  const utils = render(<CodeControl {...props} />);
  return { ...utils, onChange, props };
}

function lastEditorProps() {
  return codeMirrorEditorMock.mock.calls[codeMirrorEditorMock.mock.calls.length - 1][0];
}

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Code widget settings' }));
}

describe('CodeControl (DCMS-1387)', () => {
  beforeEach(() => {
    localStorage.clear();
    codeMirrorEditorMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with no language selected by default', async () => {
    renderControl();

    expect(screen.getByRole('button', { name: 'Code widget settings' })).toBeInTheDocument();
    expect(screen.getByTestId('codemirror-editor-stub')).toBeInTheDocument();

    await waitFor(() => {
      const editorProps = lastEditorProps();
      // No language configured: only the focus/blur handler extension, no
      // language extension pushed into the editor.
      expect(editorProps.extensions).toHaveLength(1);
    });
  });

  it('updates the passed extension and mode when the language select changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderControl({ onChange });

    await openSettings(user);

    const modeTrigger = screen.getByRole('combobox', { name: 'Mode' });
    expect(modeTrigger).toHaveTextContent('none');

    await user.click(modeTrigger);
    await user.click(await screen.findByRole('option', { name: 'JavaScript' }));

    // onChange is called with the map merged in (isMap defaults true), lang
    // key defaults to 'lang'.
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ lang: 'javascript' }));
    });

    // The resolved language extension (from the mocked loader) is threaded
    // into CodeMirrorEditor's extensions.
    await waitFor(() => {
      const editorProps = lastEditorProps();
      expect(editorProps.extensions).toContainEqual({ __mockLanguageExtension: 'javascript' });
    });

    // The mode select reflects the newly selected language.
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveTextContent('JavaScript');
    });
  });

  it('switches the CodeMirrorEditor theme between material and default via the theme toggle', async () => {
    const user = userEvent.setup();
    renderControl();

    await openSettings(user);

    // With no persisted preference, CodeControl falls back to the last
    // entry in `themes` ('material'), so the editor starts themed.
    const themeTrigger = screen.getByRole('combobox', { name: 'Theme' });
    expect(themeTrigger).toHaveTextContent('material');
    await waitFor(() => {
      expect(lastEditorProps().theme).toBe(materialTheme);
    });

    await user.click(themeTrigger);
    await user.click(await screen.findByRole('option', { name: 'default' }));

    await waitFor(() => {
      expect(lastEditorProps().theme).toBeUndefined();
    });
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveTextContent('default');

    // Switch back to material.
    await user.click(screen.getByRole('combobox', { name: 'Theme' }));
    await user.click(await screen.findByRole('option', { name: 'material' }));

    await waitFor(() => {
      expect(lastEditorProps().theme).toBe(materialTheme);
    });
  });

  it('persists theme and keymap selections to the settingsPersistKeys localStorage keys', async () => {
    const user = userEvent.setup();
    renderControl();

    await openSettings(user);

    await user.click(screen.getByRole('combobox', { name: 'Theme' }));
    await user.click(await screen.findByRole('option', { name: 'material' }));

    await waitFor(() => {
      expect(localStorage.getItem(THEME_KEY)).toBe('material');
    });

    await user.click(screen.getByRole('combobox', { name: 'KeyMap' }));
    await user.click(await screen.findByRole('option', { name: 'vim' }));

    await waitFor(() => {
      expect(localStorage.getItem(KEYMAP_KEY)).toBe('vim');
    });
  });

  it('reads the initial theme and keymap from the settingsPersistKeys localStorage keys', async () => {
    localStorage.setItem(THEME_KEY, 'material');
    localStorage.setItem(KEYMAP_KEY, 'vim');

    const user = userEvent.setup();
    renderControl();

    await waitFor(() => {
      expect(lastEditorProps().theme).toBe(materialTheme);
    });

    await openSettings(user);
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveTextContent('material');
    expect(screen.getByRole('combobox', { name: 'KeyMap' })).toHaveTextContent('vim');
  });
});

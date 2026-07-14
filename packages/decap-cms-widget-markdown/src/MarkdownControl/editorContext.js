import React, { createContext, useContext } from 'react';
import { Map } from 'immutable';

const EditorContext = createContext({
  editorControl: null,
  getEditorComponents: () => Map(),
});

/**
 * Instance-scoped access to the `editorControl` component and the
 * `getEditorComponents` accessor for the MarkdownControl instance that
 * rendered the current subtree (e.g. shortcode nodes). Replaces the
 * module-level mutable globals that previously leaked across MarkdownControl
 * instances (broken with multiple CMS instances on one page, SSR, and
 * hot-reload re-registration).
 */
export function useEditorContext() {
  return useContext(EditorContext);
}

export function EditorProvider({ children, editorControl, getEditorComponents }) {
  const value = { editorControl, getEditorComponents };
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

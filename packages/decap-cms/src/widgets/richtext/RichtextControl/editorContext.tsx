import React, { createContext, useContext } from 'react';

import type { EditorComponentsRegistry } from '@/widgets/richtext/types';
import type { ComponentType, ReactNode } from 'react';

/**
 * The nested `EditorControl` core hands down, used to render an editor
 * component's own fields inside a shortcode block. Its props are core's, not
 * this widget's, so they stay opaque here.
 */
export type EditorControlComponent = ComponentType<Record<string, unknown>>;

interface EditorContextValue {
  editorControl?: EditorControlComponent | undefined;
  editorComponents: EditorComponentsRegistry;
}

const EditorContext = createContext<EditorContextValue>({
  editorComponents: new Map(),
});

export function useEditorContext(): EditorContextValue {
  return useContext(EditorContext);
}

interface EditorProviderProps extends EditorContextValue {
  children: ReactNode;
}

export function EditorProvider({ children, editorControl, editorComponents }: EditorProviderProps) {
  const value = { editorControl, editorComponents };
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

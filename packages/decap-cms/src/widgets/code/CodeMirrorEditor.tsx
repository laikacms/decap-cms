// Minimal React wrapper around the official CodeMirror 6 packages, replacing
// the widget's previous `@uiw/react-codemirror` dependency. It only implements
// the surface the code widget needs: a controlled `value`, reconfigurable
// `extensions`/`theme`/`lineNumbers`, and a ref exposing the underlying
// `EditorView`.
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState } from '@codemirror/state';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import React from 'react';

import type { Extension } from '@codemirror/state';

export interface CodeMirrorEditorRef {
  view: EditorView | null;
}

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  extensions?: Extension[];
  theme?: Extension | undefined;
  lineNumbers?: boolean;
  minHeight?: string;
  autoFocus?: boolean | undefined;
  className?: string;
  /** Id applied to the editable `.cm-content` element so the "focus first
   * invalid control" heuristic and `aria-errormessage` (below) can locate it
   * (WCAG 2.1 3.3.1 / 3.3.3). */
  id?: string | undefined;
  ariaRequired?: boolean | undefined;
  ariaInvalid?: boolean | undefined;
  ariaErrorMessage?: string | undefined;
  /** Accessible name for the `.cm-content` editable div, since `<label
   * htmlFor>` silently fails to associate with non-labelable elements like
   * `<div>` (WCAG 4.1.2 / DCMS-1275). */
  ariaLabel?: string | undefined;
  /** Id of the field's hint text, threaded onto `.cm-content` via
   * `aria-describedby` (DCMS-1298). */
  ariaDescribedBy?: string | undefined;
}

function buildContentAttributes({
  id,
  ariaRequired,
  ariaInvalid,
  ariaErrorMessage,
  ariaLabel,
  ariaDescribedBy,
}: Pick<
  CodeMirrorEditorProps,
  'id' | 'ariaRequired' | 'ariaInvalid' | 'ariaErrorMessage' | 'ariaLabel' | 'ariaDescribedBy'
>) {
  const attrs: Record<string, string> = {};
  if (id) attrs.id = id;
  if (ariaLabel) attrs['aria-label'] = ariaLabel;
  if (ariaRequired !== undefined) attrs['aria-required'] = String(ariaRequired);
  if (ariaInvalid) {
    attrs['aria-invalid'] = 'true';
    if (ariaErrorMessage) attrs['aria-errormessage'] = ariaErrorMessage;
  }
  if (ariaDescribedBy) attrs['aria-describedby'] = ariaDescribedBy;
  return attrs;
}

// The always-on part of `basicSetup` from the `codemirror` meta package; the
// line-number gutter lives in its own compartment so it can be toggled.
const baseExtensions: Extension = [
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
];

const CodeMirrorEditor = React.forwardRef<CodeMirrorEditorRef, CodeMirrorEditorProps>(
  function CodeMirrorEditor(
    {
      value,
      onChange,
      extensions = [],
      theme,
      lineNumbers: showLineNumbers = true,
      minHeight,
      autoFocus = false,
      className,
      id,
      ariaRequired,
      ariaInvalid,
      ariaErrorMessage,
      ariaLabel,
      ariaDescribedBy,
    },
    ref,
  ) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const viewRef = React.useRef<EditorView | null>(null);

    const compartmentsRef = React.useRef<
      {
        theme: Compartment,
        extra: Compartment,
        gutter: Compartment,
        attrs: Compartment,
      } | null
    >(null);
    if (!compartmentsRef.current) {
      compartmentsRef.current = {
        theme: new Compartment(),
        extra: new Compartment(),
        gutter: new Compartment(),
        attrs: new Compartment(),
      };
    }
    const compartments = compartmentsRef.current;

    // Routed through refs so the view is created exactly once and the update
    // listener always sees the latest callback/value without reconfiguring.
    const onChangeRef = React.useRef(onChange);
    onChangeRef.current = onChange;
    const valueRef = React.useRef(value);
    valueRef.current = value;

    const initialConfigRef = React.useRef({
      theme,
      extensions,
      showLineNumbers,
      minHeight,
      autoFocus,
      id,
      ariaRequired,
      ariaInvalid,
      ariaErrorMessage,
      ariaLabel,
      ariaDescribedBy,
    });

    React.useEffect(() => {
      const initial = initialConfigRef.current;
      const parent = containerRef.current;
      const view = new EditorView({
        ...(parent === null ? {} : { parent }),
        state: EditorState.create({
          doc: valueRef.current,
          extensions: [
            compartments.gutter.of(initial.showLineNumbers ? lineNumbers() : []),
            baseExtensions,
            initial.minHeight
              ? EditorView.theme({ '&': { minHeight: initial.minHeight } })
              : [],
            compartments.theme.of(initial.theme ?? []),
            compartments.extra.of(initial.extensions),
            compartments.attrs.of(EditorView.contentAttributes.of(buildContentAttributes(initial))),
            EditorView.updateListener.of(update => {
              if (update.docChanged) {
                const doc = update.state.doc.toString();
                if (doc !== valueRef.current) {
                  onChangeRef.current(doc);
                }
              }
            }),
          ],
        }),
      });
      viewRef.current = view;
      if (initial.autoFocus) {
        view.focus();
      }
      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }, [compartments]);

    // Controlled-value sync: only push the prop into the view when it differs
    // from the document, so user edits echoed back through state are no-ops.
    React.useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      const doc = view.state.doc.toString();
      if (value !== doc) {
        view.dispatch({ changes: { from: 0, to: doc.length, insert: value } });
      }
    }, [value]);

    React.useEffect(() => {
      viewRef.current?.dispatch({ effects: compartments.theme.reconfigure(theme ?? []) });
    }, [compartments, theme]);

    React.useEffect(() => {
      viewRef.current?.dispatch({ effects: compartments.extra.reconfigure(extensions) });
    }, [compartments, extensions]);

    React.useEffect(() => {
      viewRef.current?.dispatch({
        effects: compartments.gutter.reconfigure(showLineNumbers ? lineNumbers() : []),
      });
    }, [compartments, showLineNumbers]);

    // WCAG 2.1 3.3.1 (Error Identification): CodeMirror mounts its own
    // `.cm-content` element rather than accepting a plain DOM prop, so the
    // aria wiring other widget controls apply directly to their input must
    // be pushed through a facet reconfigure instead (DCMS-1086).
    React.useEffect(() => {
      viewRef.current?.dispatch({
        effects: compartments.attrs.reconfigure(
          EditorView.contentAttributes.of(
            buildContentAttributes({ id, ariaRequired, ariaInvalid, ariaErrorMessage, ariaLabel, ariaDescribedBy }),
          ),
        ),
      });
    }, [compartments, id, ariaRequired, ariaInvalid, ariaErrorMessage, ariaLabel, ariaDescribedBy]);

    React.useImperativeHandle(
      ref,
      () => ({
        get view() {
          return viewRef.current;
        },
      }),
      [],
    );

    return <div className={className} ref={containerRef} />;
  },
);

export default CodeMirrorEditor;

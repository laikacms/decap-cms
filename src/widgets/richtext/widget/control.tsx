import { type ReactNode, useMemo, useRef } from 'react';

import {
  createLexicalRichtextValue as createRichtextValue,
  getFormat,
  LexicalRichtextValue as RichtextValue,
  resolveBlocksForField,
} from '@/lib/richtext';
import { Editor, EditorGlobalStyles } from '@/ui/editor';
import { makeBlockFormRenderer } from './BlockForm';

import type { SerializedEditorState } from 'lexical';
import type { BlocksConfig, GetAssetFn } from '@/lib/richtext';
import type { BlockFormDeps } from './BlockForm';

interface DecapField {
  format?: string;
  placeholder?: string;
  blocks?: string[];
  [key: string]: unknown;
}

interface LexicalControlProps {
  /** Stored field value: a raw string, a live `RichtextValue`, or (for nested
   * richtext fields inside a block) a Portable Text array. */
  value?: string | RichtextValue | unknown[];
  /** Decap field-config object — we read `format`, `placeholder`, `blocks`. */
  field: DecapField;
  /** Fires whenever the editor state changes — receives the same proxy each time. */
  onChange: (value: RichtextValue) => void;
  /** Decap's optional id prop for the labelled control. */
  forID?: string;
  /** Wrapper class supplied by Decap. */
  classNameWrapper?: string;
  isDisabled?: boolean;
  // Decap plumbing injected into every widget control by
  // `EditorControlPane/Widget.tsx`; used for inline block prop forms.
  editorControl?: BlockFormDeps['editorControl'];
  resolveWidget?: BlockFormDeps['resolveWidget'];
  clearFieldErrors?: BlockFormDeps['clearFieldErrors'];
  getAsset?: (path: string, field?: unknown) => unknown;
  t?: BlockFormDeps['t'];
  locale?: string;
}

/**
 * Decap CMS control component for the Lexical widget.
 *
 * Wraps the reusable Lexical editor; threads the stored value through a
 * `RichtextValue` proxy so the expensive serialized string is produced
 * lazily, only when Decap reads it at file-write time. Custom blocks and
 * format-pack extras resolve here (widget layer) and flow into the editor
 * as props/context, never the other way around.
 */
export function LexicalControl({
  value,
  field,
  onChange,
  forID,
  classNameWrapper,
  isDisabled,
  editorControl,
  resolveWidget,
  clearFieldErrors,
  getAsset,
  t,
  locale,
}: LexicalControlProps): ReactNode {
  const hint = typeof field.format === 'string' ? field.format : undefined;

  // Hold a stable RichtextValue across renders. The proxy *itself* doesn't
  // change identity — only its `editorState` mutates as the user types.
  const proxyRef = useRef<RichtextValue | null>(null);
  if (proxyRef.current === null) {
    proxyRef.current =
      value instanceof RichtextValue
        ? value
        : Array.isArray(value)
          ? // A nested richtext field inside a block stores canonical PT.
            createRichtextValue(JSON.stringify(value), { hint: hint ?? 'portableText' })
          : createRichtextValue(typeof value === 'string' ? value : '', { hint });
  }
  const proxy = proxyRef.current;

  const initialState = useMemo<SerializedEditorState | undefined>(
    () => proxy.editorState,
    // Intentionally narrow: this must only ever run once per mount. Tracking
    // `proxy.editorState` would recompute `initialState` on every keystroke (the proxy
    // is mutated in place by `onSerializedChange` below) and feed the live state back
    // into `Editor` as its *initial* state, resetting cursor position / undo history
    // and effectively discarding in-progress user edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const pack = getFormat(proxy.outputFormat);

  const blocks = useMemo(() => resolveBlocksForField(field), [field]);

  const renderBlockForm = useMemo(() => {
    // Without the decap plumbing (e.g. the editor mounted standalone) blocks
    // are still visible/insertable/deletable, just not editable.
    if (!editorControl || !resolveWidget || !clearFieldErrors || !t) return undefined;
    return makeBlockFormRenderer({
      editorControl,
      resolveWidget,
      clearFieldErrors,
      t,
      locale,
      classNameWrapper,
    });
  }, [editorControl, resolveWidget, clearFieldErrors, t, locale, classNameWrapper]);

  const blocksConfig = useMemo<BlocksConfig>(() => {
    const asset: GetAssetFn | undefined = getAsset
      ? (path, assetField) => String(getAsset(path, assetField) ?? '')
      : undefined;
    return { blocks, getAsset: asset, renderBlockForm };
  }, [blocks, getAsset, renderBlockForm]);

  return (
    <div id={forID} className={classNameWrapper}>
      <EditorGlobalStyles />
      <Editor
        editorSerializedState={initialState}
        format={proxy.outputFormat}
        extensions={pack?.lexical}
        blocksConfig={blocksConfig}
        onSerializedChange={state => {
          proxy.setEditorState(state);
          onChange(proxy);
        }}
      />
      {isDisabled ? <div aria-hidden style={{ position: 'absolute', inset: 0 }} /> : null}
    </div>
  );
}

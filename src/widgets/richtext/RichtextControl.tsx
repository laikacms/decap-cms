import { type ReactNode, useMemo, useRef } from 'react';

import { createRichtextValue, type PortableTextDocument, RichtextValue } from '../../lib/richtext/index';
import { PortableTextEditorView } from './PortableTextEditorView';

/**
 * The field props the markdown control reads. In the v4.beta fork `field` is a
 * plain object (immutable removal — DCMS-263), so `format`/`placeholder` are
 * read as plain props, NOT via `field.get(...)`.
 */
interface RichtextField {
  format?: string;
  placeholder?: string;
}

interface RichtextControlProps {
  /** Stored field value: either a raw string or a live `RichtextValue`. */
  value?: string | RichtextValue;
  /** The field's schema bag — we read `format` and `placeholder`. */
  field?: RichtextField;
  /** Called with the (mutated) `RichtextValue` on every editor change. */
  onChange: (value: RichtextValue) => void;
}

/**
 * Decap CMS control wrapping `@portabletext/editor`, registered as the
 * `richtext` widget.
 *
 * Builds a `RichtextValue` from the stored string on first render, hands the
 * canonical PT to `PortableTextEditorView`, and writes the editor's PT back
 * onto the proxy whenever the user types — so `toString()` (the expensive
 * serialise step) only fires at persist time via the widget value serializer.
 */
export function RichtextControl({
  value,
  field,
  onChange,
}: RichtextControlProps): ReactNode {
  const hint = field?.format ?? 'markdown';
  const placeholder = field?.placeholder;

  const proxyRef = useRef<RichtextValue | null>(null);
  const proxy = useMemo<RichtextValue>(() => {
    if (proxyRef.current !== null) return proxyRef.current;
    proxyRef.current = value instanceof RichtextValue
      ? value
      : createRichtextValue(typeof value === 'string' ? value : '', { hint });
    return proxyRef.current;
  }, [value, hint]);

  const handleChange = (next: PortableTextDocument): void => {
    proxy.setPortableText(next);
    onChange(proxy);
  };

  return (
    <PortableTextEditorView
      initialValue={proxy.portableText}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
}

export default RichtextControl;

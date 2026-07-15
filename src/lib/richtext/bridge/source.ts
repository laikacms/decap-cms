import { getMapper } from '@/lib/richtext/registry';
import { lexicalToPortableText } from './lexicalToPortableText';
import { portableTextToLexical } from './portableTextToLexical';

import type { SerializedEditorState } from 'lexical';

/**
 * Serialize a Lexical editor state to a format's source string
 * (Lexical -> Portable Text -> mapper). This is the exact conversion the
 * persist pipeline runs, so what a "view source" UI shows through this
 * helper is byte-identical to what would be written to disk.
 */
export function editorStateToSource(state: SerializedEditorState, format: string): string {
  return getMapper(format).fromPortableText(lexicalToPortableText(state));
}

/**
 * Parse a format's source string into a Lexical editor state
 * (mapper -> Portable Text -> Lexical). Inverse of {@link editorStateToSource}.
 *
 * Throws when the mapper is unregistered or its parse fails; callers decide
 * how to surface that (the source toggle stays in source view, for example).
 */
export function sourceToEditorState(source: string, format: string): SerializedEditorState {
  return portableTextToLexical(getMapper(format).toPortableText(source));
}

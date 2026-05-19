// Resolves CodeMirror 6 language extensions for the code widget.
//
// `@uiw/codemirror-extensions-langs` bundles every CodeMirror 6 language and
// exposes `loadLanguage(name)`, which synchronously returns a `LanguageSupport`
// extension (or `null` for an unknown language). We try each of a language's
// identifiers in turn so e.g. C — whose identifiers include "c" and "h" —
// resolves via the "c" grammar. Languages with no CodeMirror 6 grammar fall
// back to a plain-text editor.
import { loadLanguage } from '@uiw/codemirror-extensions-langs';

import type { Extension } from '@uiw/react-codemirror';
import type { LanguageName } from '@uiw/codemirror-extensions-langs';

export function getLanguageExtension(identifiers: string[]): Extension | null {
  for (const id of identifiers) {
    const extension = loadLanguage(id as LanguageName);
    if (extension) {
      return extension;
    }
  }
  return null;
}

// Resolves CodeMirror 6 language extensions for the code widget.
//
// `@codemirror/language-data` describes every official CodeMirror 6 language
// and lazy-loads each grammar on demand via dynamic import, so grammars only
// land in the bundle when a language is actually used. We try each of a
// language's identifiers in turn so e.g. C — whose identifiers include "c" and
// "h" — resolves via the "c" grammar. Languages with no CodeMirror 6 grammar
// fall back to a plain-text editor.
import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';

import type { Extension } from '@codemirror/state';

export async function getLanguageExtension(identifiers: string[]): Promise<Extension | null> {
  for (const id of identifiers) {
    const description = LanguageDescription.matchLanguageName(languages, id, false);
    if (description) {
      return description.load();
    }
  }
  return null;
}

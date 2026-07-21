import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $rootTextContent } from '@lexical/text';
import { useEffect, useState } from 'react';

let textEncoderInstance: null | TextEncoder = null;

function textEncoder(): null | TextEncoder {
  if (window.TextEncoder === undefined) {
    return null;
  }

  if (textEncoderInstance === null) {
    textEncoderInstance = new window.TextEncoder();
  }

  return textEncoderInstance;
}

function utf8Length(text: string) {
  const currentTextEncoder = textEncoder();

  if (currentTextEncoder === null) {
    // http://stackoverflow.com/a/5515960/210370
    const m = encodeURIComponent(text).match(/%[89ABab]/g);
    return text.length + (m ? m.length : 0);
  }

  return currentTextEncoder.encode(text).length;
}

interface CounterCharacterPluginProps {
  charset?: 'UTF-8' | 'UTF-16';
}

const strlen = (text: string, charset: 'UTF-8' | 'UTF-16') => {
  if (charset === 'UTF-8') {
    return utf8Length(text);
  } else if (charset === 'UTF-16') {
    return text.length;
  }
};

const countWords = (text: string) => {
  return text.split(/\s+/).filter(word => word.length > 0).length;
};

function computeStats(text: string, charset: 'UTF-8' | 'UTF-16') {
  return {
    characters: strlen(text, charset),
    words: countWords(text),
  };
}

export function CounterCharacterPlugin({
  charset = 'UTF-16',
}: CounterCharacterPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [stats, setStats] = useState(() =>
    computeStats(editor.getEditorState().read($rootTextContent), charset)
  );

  useEffect(() => {
    // Re-seed from whatever the editor currently holds. `InitialStateExtension`
    // hydrates an entry's stored content via `editor.update()`, which commits
    // asynchronously (microtask) rather than synchronously during render — so
    // the `useState` initializer above can run and capture an empty document
    // before that hydration lands. `registerTextContentListener` only reports
    // FUTURE updates, so without this seed the footer stays at
    // "0 characters | 0 words" until the user's first edit (DCMS-1237). This
    // effect runs after the hydration microtask has flushed, so it always
    // observes the up-to-date text.
    setStats(computeStats(editor.getEditorState().read($rootTextContent), charset));

    return editor.registerTextContentListener((currentText: string) => {
      setStats(computeStats(currentText, charset));
    });
  }, [editor, charset]);

  return (
    <div className="flex gap-2 text-xs whitespace-nowrap text-gray-500">
      <p>{stats.characters} characters</p>|<p>{stats.words} words</p>
    </div>
  );
}

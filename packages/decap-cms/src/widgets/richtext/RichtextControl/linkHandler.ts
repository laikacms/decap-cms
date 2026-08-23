import { unwrapLink, upsertLink } from '@platejs/link';

import type { CmsWidgetTranslate } from '@/lib/util/index';
import type { PlateEditor } from 'platejs/react';

interface LinkClickArgs {
  editor: PlateEditor;
  t: CmsWidgetTranslate;
}

export function handleLinkClick({ editor, t }: LinkClickArgs) {
  const url = window.prompt(t('editor.editorWidgets.markdown.linkPrompt'), '');
  if (url) {
    upsertLink(editor, { url, skipValidation: true });
  } else if (url === '') {
    unwrapLink(editor);
  }
}

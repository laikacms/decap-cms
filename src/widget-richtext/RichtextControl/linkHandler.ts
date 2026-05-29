// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import { unwrapLink, upsertLink } from '@platejs/link';

export function handleLinkClick({ editor, t }) {
  const url = window.prompt(t('editor.editorWidgets.markdown.linkPrompt'), '');
  if (url) {
    upsertLink(editor, { url, skipValidation: true });
  } else if (url === '') {
    unwrapLink(editor);
  }
}
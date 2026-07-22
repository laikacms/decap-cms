import { unwrapLink, upsertLink } from '@platejs/link';
import { promptDialog } from 'decap-cms-ui-default';

export async function handleLinkClick({ editor, t }) {
  const url = await promptDialog(t('editor.editorWidgets.markdown.linkPrompt'), {
    defaultValue: '',
  });
  if (url) {
    upsertLink(editor, { url, skipValidation: true });
  } else if (url === '') {
    unwrapLink(editor);
  }
}

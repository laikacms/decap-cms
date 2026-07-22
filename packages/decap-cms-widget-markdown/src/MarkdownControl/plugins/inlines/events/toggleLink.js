import { promptDialog } from 'decap-cms-ui-default';

import getActiveLink from '../selectors/getActiveLink';
import unwrapLink from '../transforms/unwrapLink';
import wrapLink from '../transforms/wrapLink';

async function toggleLink(editor, promptText) {
  const activeLink = getActiveLink(editor);
  const activeUrl = activeLink ? activeLink[0]?.data?.url : '';
  const url = await promptDialog(promptText, { defaultValue: activeUrl });
  if (url == null) return;
  if (url === '') {
    unwrapLink(editor);
    return;
  }
  wrapLink(editor, url);
}

export default toggleLink;

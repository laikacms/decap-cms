// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import { Editor } from 'slate';

import matchLink from '../../matchers/matchLink';

function getActiveLink(editor) {
  const [link] = Editor.nodes(editor, matchLink(editor));
  return link;
}

export default getActiveLink;
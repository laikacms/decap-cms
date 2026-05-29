// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import { Transforms } from 'slate';

import matchLink from '../../matchers/matchLink';

function unwrapLink(editor) {
  Transforms.unwrapNodes(editor, matchLink());
}

export default unwrapLink;
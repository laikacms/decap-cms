// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import getListContainedInListItem from '../selectors/getListContainedInListItem';

function isCursorInItemContainingNestedList(editor) {
  const nestedList = getListContainedInListItem(editor);

  return !!nestedList && `${nestedList[0].type}`.endsWith('-list');
}

export default isCursorInItemContainingNestedList;
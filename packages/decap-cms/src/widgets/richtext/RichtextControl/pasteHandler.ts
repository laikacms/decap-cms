import { htmlToSlate } from '@/widgets/richtext/serializers/index';

import type { SlateNode } from '@/widgets/richtext/types';

type Deserialize = (html: string) => SlateNode;

/**
 * The slice of the Plate editor this handler needs. Kept structural so the
 * handler can be tested without constructing a real editor.
 */
export interface FragmentInsertingEditor {
  tf?: {
    insertFragment?: (fragment: SlateNode[]) => void,
    insertNodes?: (nodes: SlateNode[]) => void,
  };
}

export function getHtmlFragment(
  html: string,
  deserialize: Deserialize = htmlToSlate,
): SlateNode[] | null {
  if (!html) {
    return null;
  }

  const slateRaw = deserialize(html);
  const fragment = Array.isArray(slateRaw?.children) ? slateRaw.children : null;

  if (!fragment || fragment.length === 0) {
    return null;
  }

  return fragment;
}

/**
 * The slice of a clipboard event this handler needs. React's `ClipboardEvent`
 * satisfies it, and so can a test double.
 */
export interface PasteEventLike {
  clipboardData: { getData: (type: string) => string } | null;
  preventDefault: () => void;
}

interface HandlePasteHtmlArgs {
  event?: PasteEventLike | null | undefined;
  editor?: FragmentInsertingEditor | null | undefined;
  isDisabled?: boolean | undefined;
  deserialize?: Deserialize | undefined;
}

export function handlePasteHtml({
  event,
  editor,
  isDisabled,
  deserialize = htmlToSlate,
}: HandlePasteHtmlArgs): boolean {
  if (isDisabled || !event || !event.clipboardData) {
    return false;
  }

  const html = event.clipboardData.getData('text/html');

  if (!html) {
    return false;
  }

  let fragment: SlateNode[] | null;

  try {
    fragment = getHtmlFragment(html, deserialize);
  } catch {
    return false;
  }

  if (!fragment) {
    return false;
  }

  event.preventDefault();

  if (typeof editor?.tf?.insertFragment === 'function') {
    editor.tf.insertFragment(fragment);
    return true;
  }

  if (typeof editor?.tf?.insertNodes === 'function') {
    editor.tf.insertNodes(fragment);
    return true;
  }

  return false;
}

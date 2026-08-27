import { htmlToSlate } from '@/widgets/richtext/serializers/index';

import type { RichTextDescendant, SlateNode } from '@/widgets/richtext/types';

type Deserialize = (html: string) => SlateNode;

/**
 * The slice of the Plate editor this handler needs. Kept structural so the
 * handler can be tested without constructing a real editor.
 */
export interface FragmentInsertingEditor {
  tf?: {
    insertFragment?: (fragment: RichTextDescendant[]) => void,
    insertNodes?: (nodes: RichTextDescendant[]) => void,
  };
}

export function getHtmlFragment(
  html: string,
  deserialize: Deserialize = htmlToSlate,
): RichTextDescendant[] | null {
  if (!html) {
    return null;
  }

  const slateRaw = deserialize(html);
  const fragment = Array.isArray(slateRaw?.children) ? slateRaw.children : null;

  if (!fragment || fragment.length === 0) {
    return null;
  }

  // HTML deserialization uses the permissive serializer working type, but a
  // returned fragment contains complete descendants at the Plate boundary.
  return fragment as RichTextDescendant[];
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

  let fragment: RichTextDescendant[] | null;

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

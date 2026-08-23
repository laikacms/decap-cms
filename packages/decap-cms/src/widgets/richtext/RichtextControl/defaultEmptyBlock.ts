import { ParagraphPlugin } from 'platejs/react';

/**
 * An empty paragraph, used as the editor's initial value.
 *
 * The return type is inferred rather than widened to `SlateNode`: Plate's
 * `Value` requires a concrete `type` and `children`, and `SlateNode` declares
 * both optional (it has to, because the serializers walk mixed arrays of
 * partially-built nodes). Annotating this as `SlateNode` would erase the
 * guarantee that this particular node is always fully formed.
 */
export default function defaultEmptyBlock(text = '') {
  return {
    type: ParagraphPlugin.key,
    children: [{ text }],
  };
}

import { describe, expect, it, vi } from 'vitest';

import { getHtmlFragment, handlePasteHtml } from '@/widgets/richtext/RichtextControl/pasteHandler';

import type { PasteEventLike } from '@/widgets/richtext/RichtextControl/pasteHandler';
import type { SlateNode } from '@/widgets/richtext/types';

function createEvent(html: string): PasteEventLike {
  return {
    clipboardData: {
      getData: vi.fn((type: string) => (type === 'text/html' ? html : '')),
    },
    preventDefault: vi.fn(),
  };
}

const root: SlateNode = {
  type: 'root',
  children: [{ type: 'p', children: [{ text: 'value' }] }],
};

describe('pasteHandler', () => {
  describe('getHtmlFragment', () => {
    it('should return null when html is empty', () => {
      expect(getHtmlFragment('')).toBeNull();
    });

    it('should return slate root children as a fragment', () => {
      const deserialize = vi.fn(() => ({
        type: 'root',
        children: [{ type: 'p', children: [{ text: 'Hello world' }] }],
      }));

      expect(getHtmlFragment('<p>Hello world</p>', deserialize)).toEqual([
        { type: 'p', children: [{ text: 'Hello world' }] },
      ]);
      expect(deserialize).toHaveBeenCalledWith('<p>Hello world</p>');
    });
  });

  describe('handlePasteHtml', () => {
    it('should ignore paste when editor is disabled', () => {
      const event = createEvent('<p>value</p>');
      const editor = { tf: { insertFragment: vi.fn() } };

      expect(
        handlePasteHtml({ event, editor, isDisabled: true }),
      ).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(editor.tf.insertFragment).not.toHaveBeenCalled();
    });

    it('should ignore paste when html is not present', () => {
      const event = createEvent('');
      const editor = { tf: { insertFragment: vi.fn() } };

      expect(
        handlePasteHtml({ event, editor, isDisabled: false }),
      ).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(editor.tf.insertFragment).not.toHaveBeenCalled();
    });

    it('should insert parsed fragment with insertFragment when available', () => {
      const event = createEvent('<p>value</p>');
      const editor = { tf: { insertFragment: vi.fn() } };
      const deserialize = vi.fn(() => root);

      expect(
        handlePasteHtml({
          event,
          editor,
          isDisabled: false,
          deserialize,
        }),
      ).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(editor.tf.insertFragment).toHaveBeenCalledWith([
        { type: 'p', children: [{ text: 'value' }] },
      ]);
    });

    it('should fall back to insertNodes when insertFragment is not available', () => {
      const event = createEvent('<p>value</p>');
      const editor = { tf: { insertNodes: vi.fn() } };
      const deserialize = vi.fn(() => root);

      expect(
        handlePasteHtml({
          event,
          editor,
          isDisabled: false,
          deserialize,
        }),
      ).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(editor.tf.insertNodes).toHaveBeenCalledWith([
        { type: 'p', children: [{ text: 'value' }] },
      ]);
    });
  });
});

import { getHtmlFragment, handlePasteHtml } from '../pasteHandler';

describe('pasteHandler', () => {
  describe('getHtmlFragment', () => {
    it('should return null when html is empty', () => {
      expect(getHtmlFragment('')).toBeNull();
    });

    it('should return null when html is null', () => {
      expect(getHtmlFragment(null)).toBeNull();
    });

    it('should return slate root children as a fragment', () => {
      const deserialize = jest.fn(() => ({
        type: 'root',
        children: [{ type: 'p', children: [{ text: 'Hello world' }] }],
      }));

      expect(getHtmlFragment('<p>Hello world</p>', deserialize)).toEqual([
        { type: 'p', children: [{ text: 'Hello world' }] },
      ]);
      expect(deserialize).toHaveBeenCalledWith('<p>Hello world</p>');
    });

    it('should return null when deserialized children is an empty array', () => {
      const deserialize = jest.fn(() => ({ type: 'root', children: [] }));

      expect(getHtmlFragment('<p></p>', deserialize)).toBeNull();
    });

    it('should return null when deserialized children is not an array', () => {
      const deserialize = jest.fn(() => ({ type: 'root', children: 'not-an-array' }));

      expect(getHtmlFragment('<p>value</p>', deserialize)).toBeNull();
    });

    it('should return null when deserialize returns a falsy value', () => {
      const deserialize = jest.fn(() => null);

      expect(getHtmlFragment('<p>value</p>', deserialize)).toBeNull();
    });
  });

  describe('handlePasteHtml', () => {
    function createEvent(html) {
      return {
        clipboardData: {
          getData: jest.fn(type => (type === 'text/html' ? html : '')),
        },
        preventDefault: jest.fn(),
      };
    }

    it('should ignore paste when editor is disabled', () => {
      const event = createEvent('<p>value</p>');
      const editor = { tf: { insertFragment: jest.fn() } };

      expect(handlePasteHtml({ event, editor, isDisabled: true })).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(editor.tf.insertFragment).not.toHaveBeenCalled();
    });

    it('should ignore paste when html is not present', () => {
      const event = createEvent('');
      const editor = { tf: { insertFragment: jest.fn() } };

      expect(handlePasteHtml({ event, editor, isDisabled: false })).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(editor.tf.insertFragment).not.toHaveBeenCalled();
    });

    it('should ignore paste when event is missing', () => {
      const editor = { tf: { insertFragment: jest.fn() } };

      expect(handlePasteHtml({ event: null, editor, isDisabled: false })).toBe(false);
      expect(editor.tf.insertFragment).not.toHaveBeenCalled();
    });

    it('should ignore paste when clipboardData is missing', () => {
      const event = { preventDefault: jest.fn() };
      const editor = { tf: { insertFragment: jest.fn() } };

      expect(handlePasteHtml({ event, editor, isDisabled: false })).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(editor.tf.insertFragment).not.toHaveBeenCalled();
    });

    it('should return false without throwing when deserialize throws', () => {
      const event = createEvent('<p>value</p>');
      const editor = { tf: { insertFragment: jest.fn() } };
      const deserialize = jest.fn(() => {
        throw new Error('boom');
      });

      expect(() =>
        handlePasteHtml({ event, editor, isDisabled: false, deserialize }),
      ).not.toThrow();
      expect(handlePasteHtml({ event, editor, isDisabled: false, deserialize })).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(editor.tf.insertFragment).not.toHaveBeenCalled();
    });

    it('should return false when the deserialized fragment is empty', () => {
      const event = createEvent('<p></p>');
      const editor = { tf: { insertFragment: jest.fn() } };
      const deserialize = jest.fn(() => ({ type: 'root', children: [] }));

      expect(handlePasteHtml({ event, editor, isDisabled: false, deserialize })).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(editor.tf.insertFragment).not.toHaveBeenCalled();
    });

    it('should insert parsed fragment with insertFragment when available', () => {
      const event = createEvent('<p>value</p>');
      const editor = { tf: { insertFragment: jest.fn() } };
      const deserialize = jest.fn(() => ({
        type: 'root',
        children: [{ type: 'p', children: [{ text: 'value' }] }],
      }));

      expect(handlePasteHtml({ event, editor, isDisabled: false, deserialize })).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(editor.tf.insertFragment).toHaveBeenCalledWith([
        { type: 'p', children: [{ text: 'value' }] },
      ]);
    });

    it('should fall back to insertNodes when insertFragment is not available', () => {
      const event = createEvent('<p>value</p>');
      const editor = { tf: { insertNodes: jest.fn() } };
      const deserialize = jest.fn(() => ({
        type: 'root',
        children: [{ type: 'p', children: [{ text: 'value' }] }],
      }));

      expect(handlePasteHtml({ event, editor, isDisabled: false, deserialize })).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(editor.tf.insertNodes).toHaveBeenCalledWith([
        { type: 'p', children: [{ text: 'value' }] },
      ]);
    });

    it('should prefer insertFragment over insertNodes when both are available', () => {
      const event = createEvent('<p>value</p>');
      const editor = { tf: { insertFragment: jest.fn(), insertNodes: jest.fn() } };
      const deserialize = jest.fn(() => ({
        type: 'root',
        children: [{ type: 'p', children: [{ text: 'value' }] }],
      }));

      expect(handlePasteHtml({ event, editor, isDisabled: false, deserialize })).toBe(true);
      expect(editor.tf.insertFragment).toHaveBeenCalledWith([
        { type: 'p', children: [{ text: 'value' }] },
      ]);
      expect(editor.tf.insertNodes).not.toHaveBeenCalled();
    });

    it('should return false when neither insertFragment nor insertNodes is available', () => {
      const event = createEvent('<p>value</p>');
      const editor = { tf: {} };
      const deserialize = jest.fn(() => ({
        type: 'root',
        children: [{ type: 'p', children: [{ text: 'value' }] }],
      }));

      expect(handlePasteHtml({ event, editor, isDisabled: false, deserialize })).toBe(false);
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });
});

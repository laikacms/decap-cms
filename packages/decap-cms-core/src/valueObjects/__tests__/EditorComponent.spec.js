import { fromJS } from 'immutable';

import createEditorComponent from '../EditorComponent';

describe('createEditorComponent', () => {
  describe('id field', () => {
    it('uses label to derive id when id is not provided', () => {
      const result = createEditorComponent({ label: 'My Cool Plugin' });
      expect(result.id).toBe('My_Cool_Plugin');
    });

    it('replaces non-alphanumeric sequences with underscore in derived id', () => {
      const result = createEditorComponent({ label: 'hello world & stuff!' });
      expect(result.id).toBe('hello_world_stuff_');
    });

    it('uses provided id as-is', () => {
      const result = createEditorComponent({ id: 'my-custom-id', label: 'Ignored Label' });
      expect(result.id).toBe('my-custom-id');
    });
  });

  describe('fromBlock default', () => {
    it('defaults to a function returning an empty object when fromBlock is absent', () => {
      const result = createEditorComponent({ label: 'Test' });
      expect(typeof result.fromBlock).toBe('function');
      expect(result.fromBlock()).toEqual({});
    });

    it('uses the provided fromBlock function', () => {
      function fromBlock(match) {
        return { matched: match[0] };
      }
      const result = createEditorComponent({ label: 'Test', fromBlock });
      expect(result.fromBlock(['hello'])).toEqual({ matched: 'hello' });
    });
  });

  describe('toBlock default', () => {
    it('defaults to a function returning "Plugin" when toBlock is absent', () => {
      const result = createEditorComponent({ label: 'Test' });
      expect(typeof result.toBlock).toBe('function');
      expect(result.toBlock()).toBe('Plugin');
    });

    it('uses the provided toBlock function', () => {
      function toBlock(data) {
        return `[shortcode data="${data.value}"]`;
      }
      const result = createEditorComponent({ label: 'Test', toBlock });
      expect(result.toBlock({ value: 'hello' })).toBe('[shortcode data="hello"]');
    });
  });

  describe('toPreview fallthrough', () => {
    it('falls through to the toBlock default when widget is falsy and toPreview is absent', () => {
      const result = createEditorComponent({ label: 'Test', widget: '' });
      expect(typeof result.toPreview).toBe('function');
      expect(result.toPreview()).toBe('Plugin');
    });

    it('falls through to the provided toBlock when widget is falsy and toPreview is absent', () => {
      function toBlock() {
        return 'CustomBlock';
      }
      const result = createEditorComponent({ label: 'Test', widget: '', toBlock });
      expect(result.toPreview()).toBe('CustomBlock');
    });

    it('uses provided toPreview when given', () => {
      function toPreview(data) {
        return `<strong>${data}</strong>`;
      }
      const result = createEditorComponent({ label: 'Test', toPreview });
      expect(result.toPreview('hi')).toBe('<strong>hi</strong>');
    });

    it('does not set toPreview to a function when widget is truthy and toPreview is absent', () => {
      // widget defaults to 'object' (truthy); toPreview should be falsy
      const result = createEditorComponent({ label: 'Test', widget: 'object' });
      expect(result.toPreview).toBeFalsy();
    });
  });

  describe('fields conversion', () => {
    it('converts fields array to Immutable List', () => {
      const fields = [{ name: 'title', widget: 'string' }];
      const result = createEditorComponent({ label: 'Test', fields });
      expect(result.fields).toEqual(fromJS(fields));
    });

    it('defaults to empty Immutable List when fields is not provided', () => {
      const result = createEditorComponent({ label: 'Test' });
      expect(result.fields).toEqual(fromJS([]));
    });
  });
});

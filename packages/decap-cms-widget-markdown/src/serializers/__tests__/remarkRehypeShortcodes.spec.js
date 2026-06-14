import React from 'react';
import { Map } from 'immutable';

import remarkToRehypeShortcodes, { processShortcodes } from '../remarkRehypeShortcodes';

function makeOptions({
  plugins = Map(),
  getAsset = jest.fn(),
  resolveWidget = jest.fn(),
  toHtml = jest.fn(),
} = {}) {
  return { plugins, getAsset, resolveWidget, toHtml };
}

describe('remarkRehypeShortcodes', () => {
  describe('processShortcodes', () => {
    it('passes through nodes without shortcode data unchanged', () => {
      const node = { type: 'paragraph', children: [{ type: 'text', value: 'hello' }] };
      const opts = makeOptions();
      const result = processShortcodes(node, opts);
      expect(result).toBe(node);
    });

    it('passes through nodes with data but no shortcode key unchanged', () => {
      const node = { type: 'paragraph', data: { foo: 'bar' }, children: [] };
      const opts = makeOptions();
      const result = processShortcodes(node, opts);
      expect(result).toBe(node);
    });

    it('replaces node children with html node when toPreview returns a string', () => {
      const plugin = { toPreview: jest.fn(() => '<b>preview</b>') };
      const plugins = Map({ myShortcode: plugin });
      const getAsset = jest.fn();
      const node = {
        type: 'shortcode',
        data: { shortcode: 'myShortcode', shortcodeData: { foo: 'bar' } },
      };
      const opts = makeOptions({ plugins, getAsset });

      const result = processShortcodes(node, opts);

      expect(plugin.toPreview).toHaveBeenCalledWith({ foo: 'bar' }, getAsset, undefined);
      expect(result).not.toBe(node);
      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('html');
      expect(result.children[0].value).toBe('<b>preview</b>');
    });

    it('renders React component from toPreview to string using renderToString', () => {
      function ReactComponent() {
        return React.createElement('span', null, 'react preview');
      }
      const plugin = { toPreview: jest.fn(() => React.createElement(ReactComponent)) };
      const plugins = Map({ reactShortcode: plugin });
      const node = {
        type: 'shortcode',
        data: { shortcode: 'reactShortcode', shortcodeData: {} },
      };
      const opts = makeOptions({ plugins });

      const result = processShortcodes(node, opts);

      expect(result.children).toHaveLength(1);
      expect(result.children[0].type).toBe('html');
      expect(result.children[0].value).toContain('react preview');
    });

    it('preserves other node properties when processing shortcode node', () => {
      const plugin = { toPreview: jest.fn(() => '<em>hi</em>') };
      const plugins = Map({ sc: plugin });
      const node = {
        type: 'shortcode',
        position: { start: { line: 1 }, end: { line: 1 } },
        data: { shortcode: 'sc', shortcodeData: {} },
      };
      const opts = makeOptions({ plugins });

      const result = processShortcodes(node, opts);

      expect(result.type).toBe('shortcode');
      expect(result.position).toBe(node.position);
      expect(result.data).toBe(node.data);
    });
  });

  describe('remarkToRehypeShortcodes (default export)', () => {
    it('returns a transform function', () => {
      const transform = remarkToRehypeShortcodes(makeOptions());
      expect(typeof transform).toBe('function');
    });

    it('transforms root children, leaving non-shortcode nodes intact', () => {
      const opts = makeOptions();
      const transform = remarkToRehypeShortcodes(opts);

      const plainNode = { type: 'paragraph', children: [{ type: 'text', value: 'hello' }] };
      const root = { type: 'root', children: [plainNode] };

      const result = transform(root);

      expect(result.children[0]).toBe(plainNode);
    });

    it('transforms root children with shortcodes', () => {
      const plugin = { toPreview: jest.fn(() => '<strong>shortcode</strong>') };
      const plugins = Map({ sc: plugin });
      const opts = makeOptions({ plugins });
      const transform = remarkToRehypeShortcodes(opts);

      const shortcodeNode = {
        type: 'shortcode',
        data: { shortcode: 'sc', shortcodeData: { x: 1 } },
      };
      const root = { type: 'root', children: [shortcodeNode] };

      const result = transform(root);

      expect(result.children[0].children[0].type).toBe('html');
      expect(result.children[0].children[0].value).toBe('<strong>shortcode</strong>');
    });

    it('preserves root node properties', () => {
      const opts = makeOptions();
      const transform = remarkToRehypeShortcodes(opts);
      const root = { type: 'root', children: [], extra: 'data' };

      const result = transform(root);

      expect(result.type).toBe('root');
      expect(result.extra).toBe('data');
    });
  });
});

import React from 'react';
import { Map } from 'immutable';

import remarkToRehypeShortcodes from '../remarkRehypeShortcodes';

function makeOptions({
  plugins = Map(),
  getAsset = jest.fn(),
  resolveWidget = jest.fn(),
  toHtml = jest.fn(),
} = {}) {
  return { plugins, getAsset, resolveWidget, toHtml };
}

describe('remarkRehypeShortcodes', () => {
  it('returns a transform function', () => {
    const transform = remarkToRehypeShortcodes(makeOptions());
    expect(typeof transform).toBe('function');
  });

  it('passes through nodes without shortcode data unchanged', () => {
    const opts = makeOptions();
    const transform = remarkToRehypeShortcodes(opts);

    const plainNode = { type: 'paragraph', children: [{ type: 'text', value: 'hello' }] };
    const root = { type: 'root', children: [plainNode] };

    const result = transform(root);

    expect(result.children[0]).toBe(plainNode);
  });

  it('passes through nodes with data but no shortcode key unchanged', () => {
    const opts = makeOptions();
    const transform = remarkToRehypeShortcodes(opts);

    const node = { type: 'paragraph', data: { foo: 'bar' }, children: [] };
    const root = { type: 'root', children: [node] };

    const result = transform(root);

    expect(result.children[0]).toBe(node);
  });

  it('replaces shortcode node children with an html node when toPreview returns a string', () => {
    const toPreview = jest.fn(() => '<strong>shortcode</strong>');
    const plugin = { toPreview };
    const plugins = Map({ sc: plugin });
    const getAsset = jest.fn();
    const opts = makeOptions({ plugins, getAsset });
    const transform = remarkToRehypeShortcodes(opts);

    const shortcodeNode = {
      type: 'shortcode',
      data: { shortcode: 'sc', shortcodeData: { x: 1 } },
    };
    const root = { type: 'root', children: [shortcodeNode] };

    const result = transform(root);

    expect(toPreview).toHaveBeenCalledWith({ x: 1 }, getAsset, undefined);
    expect(result.children[0]).not.toBe(shortcodeNode);
    expect(result.children[0].children).toHaveLength(1);
    expect(result.children[0].children[0].type).toBe('html');
    expect(result.children[0].children[0].value).toBe('<strong>shortcode</strong>');
  });

  it('renders a React component returned from toPreview to an html string using renderToString', () => {
    function ReactComponent() {
      return React.createElement('span', null, 'react preview');
    }
    const plugin = { toPreview: jest.fn(() => React.createElement(ReactComponent)) };
    const plugins = Map({ reactShortcode: plugin });
    const opts = makeOptions({ plugins });
    const transform = remarkToRehypeShortcodes(opts);

    const shortcodeNode = {
      type: 'shortcode',
      data: { shortcode: 'reactShortcode', shortcodeData: {} },
    };
    const root = { type: 'root', children: [shortcodeNode] };

    const result = transform(root);

    expect(result.children[0].children[0].type).toBe('html');
    expect(result.children[0].children[0].value).toContain('react preview');
  });

  it('preserves other shortcode node properties after processing', () => {
    const plugin = { toPreview: jest.fn(() => '<em>hi</em>') };
    const plugins = Map({ sc: plugin });
    const opts = makeOptions({ plugins });
    const transform = remarkToRehypeShortcodes(opts);

    const shortcodeNode = {
      type: 'shortcode',
      position: { start: { line: 1 }, end: { line: 1 } },
      data: { shortcode: 'sc', shortcodeData: {} },
    };
    const root = { type: 'root', children: [shortcodeNode] };

    const result = transform(root);

    expect(result.children[0].type).toBe('shortcode');
    expect(result.children[0].position).toBe(shortcodeNode.position);
    expect(result.children[0].data).toBe(shortcodeNode.data);
  });

  it('preserves root node properties', () => {
    const opts = makeOptions();
    const transform = remarkToRehypeShortcodes(opts);
    const root = { type: 'root', children: [], extra: 'data' };

    const result = transform(root);

    expect(result.type).toBe('root');
    expect(result.extra).toBe('data');
  });

  it('renders each sub-field with toHtml when the plugin has no toPreview but has fields', () => {
    const { List, Map: ImmutableMap } = require('immutable');
    const fields = List([
      ImmutableMap({ name: 'title', widget: 'string' }),
      ImmutableMap({ name: 'body', widget: 'markdown' }),
    ]);
    const plugin = { fields };
    const plugins = Map({ container: plugin });
    const toHtml = jest.fn(value => `<div>${value}</div>`);
    const opts = makeOptions({ plugins, toHtml });
    const transform = remarkToRehypeShortcodes(opts);

    const shortcodeNode = {
      type: 'shortcode',
      data: {
        shortcode: 'container',
        shortcodeData: { title: 'Hello', body: 'World' },
      },
    };
    const root = { type: 'root', children: [shortcodeNode] };

    const result = transform(root);

    expect(toHtml).toHaveBeenCalledWith('World');
    expect(result.children[0].children[0].value).toBe('<p>Hello</p><div>World</div>');
  });

  it('falls back to resolving the widget preview when no toPreview and no usable fields exist', () => {
    function PreviewComponent({ value }) {
      return React.createElement('span', null, `preview:${value.foo}`);
    }
    const plugin = { widget: 'custom' };
    const plugins = Map({ custom: plugin });
    const resolveWidget = jest.fn(() => ({ preview: PreviewComponent }));
    const opts = makeOptions({ plugins, resolveWidget });
    const transform = remarkToRehypeShortcodes(opts);

    const shortcodeNode = {
      type: 'shortcode',
      data: { shortcode: 'custom', shortcodeData: { foo: 'bar' } },
    };
    const root = { type: 'root', children: [shortcodeNode] };

    const result = transform(root);

    expect(resolveWidget).toHaveBeenCalledWith('custom');
    expect(result.children[0].children[0].value).toContain('preview:bar');
  });
});

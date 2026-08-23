import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createEditorComponent,
  getEditorComponents,
  registerEditorComponent,
  unregisterEditorComponent,
} from '@/widgets/richtext/editorComponents';

describe('createEditorComponent', () => {
  it('derives an id from the label when none is given', () => {
    expect(createEditorComponent({ label: 'My Great Block' }).id).toBe('My_Great_Block');
  });

  it('keeps an explicit id', () => {
    expect(createEditorComponent({ id: 'youtube', label: 'YouTube' }).id).toBe('youtube');
  });

  it('fills in defaults for an otherwise empty config', () => {
    const component = createEditorComponent({});

    expect(component.label).toBe('unnamed component');
    expect(component.type).toBe('shortcode');
    expect(component.widget).toBe('object');
    expect(component.icon).toBe('exclamation-triangle');
    expect(component.fields).toEqual([]);
    expect(component.fromBlock([''])).toEqual({});
    expect(component.toBlock({})).toBe('Plugin');
  });

  it('never matches with the default pattern', () => {
    expect('anything at all'.match(createEditorComponent({}).pattern)).toBeNull();
  });

  it('keeps the supplied block serializers', () => {
    const component = createEditorComponent({
      id: 'note',
      pattern: /^note: (.*)$/,
      fromBlock: match => ({ body: match[1] }),
      toBlock: data => `note: ${String(data.body)}`,
    });

    const match = 'note: hello'.match(component.pattern);
    expect(match).not.toBeNull();
    expect(component.fromBlock(match ?? [''])).toEqual({ body: 'hello' });
    expect(component.toBlock({ body: 'hello' })).toBe('note: hello');
  });

  it('carries unknown config through untouched', () => {
    expect(createEditorComponent({ id: 'a', collection: 'posts' }).collection).toBe('posts');
  });
});

describe('the editor component registry', () => {
  beforeEach(() => {
    for (const id of [...getEditorComponents().keys()]) {
      unregisterEditorComponent(id);
    }
  });

  it('registers components in insertion order', () => {
    registerEditorComponent({ id: 'first', label: 'First' });
    registerEditorComponent({ id: 'second', label: 'Second' });

    expect([...getEditorComponents().keys()]).toEqual(['first', 'second']);
  });

  it('allows only one code-block component, replacing the previous one', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    registerEditorComponent({ id: 'old-code', label: 'Old', type: 'code-block' });
    registerEditorComponent({ id: 'new-code', label: 'New', type: 'code-block' });

    expect([...getEditorComponents().keys()]).toEqual(['new-code']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Only one editor component'));

    warn.mockRestore();
  });

  it('unregisters components', () => {
    registerEditorComponent({ id: 'gone', label: 'Gone' });
    unregisterEditorComponent('gone');

    expect(getEditorComponents().has('gone')).toBe(false);
  });
});

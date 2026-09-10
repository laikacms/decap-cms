import { describe, expect, it } from 'vitest';

import { filterEditorComponents } from '@/widgets/richtext/RichtextControl/filterEditorComponents';

import type { EditorComponent, EditorComponentsRegistry } from '@/widgets/richtext/types';

function component(id: string): EditorComponent {
  return {
    id,
    label: id,
    type: 'shortcode',
    icon: 'exclamation-triangle',
    widget: 'object',
    pattern: /.^/,
    fields: [],
    fromBlock: () => ({}),
    toBlock: () => '',
    toPreview: undefined,
  };
}

function registry(...ids: string[]): EditorComponentsRegistry {
  return new Map(ids.map(id => [id, component(id)]));
}

describe('filterEditorComponents', () => {
  it('returns the registry untouched when the field lists no editor_components', () => {
    const all = registry('image', 'code-block', 'youtube');

    expect(filterEditorComponents(all, undefined)).toBe(all);
  });

  it('keeps only the components the field names', () => {
    const filtered = filterEditorComponents(registry('image', 'code-block', 'youtube'), [
      'image',
      'youtube',
    ]);

    expect([...filtered.keys()]).toEqual(['image', 'youtube']);
  });

  it('offers no components for an explicitly empty list', () => {
    const filtered = filterEditorComponents(registry('image', 'youtube'), []);

    expect(filtered.size).toBe(0);
  });

  it('ignores names that are not registered', () => {
    const filtered = filterEditorComponents(registry('image'), ['image', 'not-registered-yet']);

    expect([...filtered.keys()]).toEqual(['image']);
  });

  it('does not mutate the registry it filters', () => {
    const all = registry('image', 'youtube');

    filterEditorComponents(all, ['image']);

    expect([...all.keys()]).toEqual(['image', 'youtube']);
  });
});

import { fromJS } from 'immutable';

import { normalizeField } from '../normalizeField';

describe('normalizeField', () => {
  it('copies editorComponents into editor_components when snake_case is missing', () => {
    const field = fromJS({ widget: 'markdown', editorComponents: ['image', 'code-block'] });

    const normalized = normalizeField(field);

    expect(normalized.get('editor_components')).toEqual(fromJS(['image', 'code-block']));
    expect(normalized.get('editorComponents')).toEqual(fromJS(['image', 'code-block']));
  });

  it('leaves editor_components untouched when it is already set', () => {
    const field = fromJS({
      widget: 'markdown',
      editor_components: ['image'],
      editorComponents: ['code-block'],
    });

    const normalized = normalizeField(field);

    expect(normalized.get('editor_components')).toEqual(fromJS(['image']));
  });

  it('does not add editor_components when editorComponents is absent', () => {
    const field = fromJS({ widget: 'markdown' });

    const normalized = normalizeField(field);

    expect(normalized.has('editor_components')).toBe(false);
  });

  it('treats an explicit falsy editor_components value as already set', () => {
    const field = fromJS({ editor_components: false, editorComponents: ['image'] });

    const normalized = normalizeField(field);

    expect(normalized.get('editor_components')).toBe(false);
  });

  it('returns a new immutable value rather than mutating the input', () => {
    const field = fromJS({ editorComponents: ['image'] });

    const normalized = normalizeField(field);

    expect(normalized).not.toBe(field);
    expect(field.has('editor_components')).toBe(false);
  });
});

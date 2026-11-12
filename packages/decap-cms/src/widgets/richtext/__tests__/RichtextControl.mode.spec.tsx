import { beforeEach, describe, expect, it } from 'vitest';

import RichtextControl from '@/widgets/richtext/RichtextControl';

function initialMode(field: Record<string, unknown>) {
  const control = new RichtextControl({
    field,
    editorControl: () => null,
    getEditorComponents: () => ({}),
  } as any);
  return control.state.mode;
}

describe('RichtextControl initial mode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts in rich text by default', () => {
    expect(initialMode({})).toBe('rich_text');
  });

  it('starts in the first mode listed in `modes`', () => {
    expect(initialMode({ modes: ['raw', 'rich_text'] })).toBe('raw');
  });

  it('prefers the mode the user picked last, when the field allows it', () => {
    localStorage.setItem('cms.md-mode', 'rich_text');
    expect(initialMode({ modes: ['raw', 'rich_text'] })).toBe('rich_text');
  });

  it('ignores a saved mode the field does not allow', () => {
    localStorage.setItem('cms.md-mode', 'rich_text');
    expect(initialMode({ modes: ['raw'] })).toBe('raw');
  });
});

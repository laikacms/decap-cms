import { afterEach, describe, expect, it, vi } from 'vitest';

import { Backend } from '@/core/backend';
import { registerFieldAction, setEditorApi } from '@/core/lib/registry';

// Upstream 2884f29fc: a backend with `attachEditor` receives the editor API
// and the field-action registry once, when core builds it.

const editor = { getCurrentEntry: vi.fn(), applyFieldPatch: vi.fn(), onEditorChange: vi.fn() };

function build(implementation: Record<string, unknown>) {
  implementation.init = () => implementation;
  return new Backend(implementation as never, { config: { backend: {} } as never, backendName: 'test' });
}

afterEach(() => {
  setEditorApi(null);
});

describe('Backend attachEditor', () => {
  it('hands a backend that asks for it the editor API and registerFieldAction', () => {
    setEditorApi(editor);
    const attachEditor = vi.fn();

    build({ attachEditor });

    expect(attachEditor).toHaveBeenCalledTimes(1);
    expect(attachEditor).toHaveBeenCalledWith({ editor, registerFieldAction });
  });

  it('does nothing without an editor API', () => {
    const attachEditor = vi.fn();

    build({ attachEditor });

    expect(attachEditor).not.toHaveBeenCalled();
  });

  it('leaves backends without attachEditor alone', () => {
    setEditorApi(editor);
    expect(() => build({})).not.toThrow();
  });
});

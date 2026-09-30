import { exportFile, importFile } from '@lexical/file';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportExportPlugin } from './ImportExportPlugin';

const stubEditor = vi.hoisted(() => ({ name: 'stub-editor' }));

vi.mock('@lexical/file', () => ({
  exportFile: vi.fn(),
  importFile: vi.fn(),
}));

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [stubEditor],
}));

describe('ImportExportPlugin', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2024-03-05T10:20:30.456Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('calls neither importFile nor exportFile on render', () => {
    render(<ImportExportPlugin />);
    expect(importFile).not.toHaveBeenCalled();
    expect(exportFile).not.toHaveBeenCalled();
  });

  it('calls importFile(editor) once when the import button is clicked', () => {
    render(<ImportExportPlugin />);
    fireEvent.click(screen.getByLabelText('Import editor state from JSON'));
    expect(importFile).toHaveBeenCalledTimes(1);
    expect(importFile).toHaveBeenCalledWith(stubEditor);
    expect(exportFile).not.toHaveBeenCalled();
  });

  it('calls exportFile(editor, opts) once with source and dated fileName', () => {
    render(<ImportExportPlugin />);
    fireEvent.click(screen.getByLabelText('Export editor state to JSON'));
    expect(exportFile).toHaveBeenCalledTimes(1);
    const [editor, opts] = vi.mocked(exportFile).mock.calls[0];
    expect(editor).toBe(stubEditor);
    expect(opts?.source).toBe('Editor');
    expect(opts?.fileName).toMatch(/^Editor \d{4}-\d{2}-\d{2}T/);
    expect(opts?.fileName).toBe('Editor 2024-03-05T10:20:30.456Z');
    expect(importFile).not.toHaveBeenCalled();
  });
});

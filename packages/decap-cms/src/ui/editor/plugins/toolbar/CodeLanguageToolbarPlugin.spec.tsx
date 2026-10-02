import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CodeLanguageToolbarPlugin } from './CodeLanguageToolbarPlugin';

vi.mock('@/ui/editor/context/ToolbarContext', () => ({
  useToolbarContext: () => ({ activeEditor: { update: vi.fn(), getElementByKey: vi.fn() } }),
}));

vi.mock('@/ui/editor/editor-hooks/useUpdateToolbar', () => ({
  useUpdateToolbarHandler: vi.fn(),
}));

describe('CodeLanguageToolbarPlugin', () => {
  it('gives the language select trigger an accessible name', () => {
    render(<CodeLanguageToolbarPlugin />);
    expect(screen.getByRole('combobox', { name: 'Code language' })).toBeTruthy();
  });
});

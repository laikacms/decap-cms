import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Editor } from '@/ui/editor/Editor';

/**
 * Regression test for DCMS-1062: the font-size ± buttons and the
 * font-color / font-background color-picker triggers rendered as
 * icon-only `<Button>`s with no `aria-label` and no `title`, so screen
 * readers announced them as an unnamed "button". Mirrors the accessible
 * name assertions `HistoryToolbarPlugin.spec.tsx`-style tests use for
 * Undo/Redo.
 */
describe('Editor toolbar icon buttons - accessible name (DCMS-1062)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('exposes a non-empty aria-label on the decrease font size button', () => {
    render(<Editor />);
    const button = screen.getByRole('button', { name: 'Decrease font size' });
    expect(button.getAttribute('aria-label')).toBe('Decrease font size');
    expect(button.getAttribute('title')).toBe('Decrease font size');
  });

  it('exposes a non-empty aria-label on the increase font size button', () => {
    render(<Editor />);
    const button = screen.getByRole('button', { name: 'Increase font size' });
    expect(button.getAttribute('aria-label')).toBe('Increase font size');
    expect(button.getAttribute('title')).toBe('Increase font size');
  });

  it('exposes a non-empty aria-label on the font color trigger', () => {
    render(<Editor />);
    const button = screen.getByRole('button', { name: 'Text color' });
    expect(button.getAttribute('aria-label')).toBe('Text color');
    expect(button.getAttribute('title')).toBe('Text color');
  });

  it('exposes a non-empty aria-label on the font background color trigger', () => {
    render(<Editor />);
    const button = screen.getByRole('button', { name: 'Text background color' });
    expect(button.getAttribute('aria-label')).toBe('Text background color');
    expect(button.getAttribute('title')).toBe('Text background color');
  });

  it('exposes a non-empty aria-label on the font size input (DCMS-1316)', () => {
    render(<Editor />);
    const input = screen.getByLabelText('Font size');
    expect(input.getAttribute('aria-label')).toBe('Font size');
    expect(input.getAttribute('title')).toBe('Font size');
  });
});

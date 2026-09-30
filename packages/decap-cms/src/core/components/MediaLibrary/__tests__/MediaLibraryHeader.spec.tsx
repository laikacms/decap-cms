import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import MediaLibraryHeader from '@/core/components/MediaLibrary/MediaLibraryHeader';

const t = (key: string) => `t:${key}`;

describe('MediaLibraryHeader', () => {
  it('labels the close button with the translated close string', () => {
    render(<MediaLibraryHeader onClose={vi.fn()} title="Media" t={t} />);

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe(t('mediaLibrary.mediaLibraryModal.close'));
  });

  it('calls onClose exactly once when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<MediaLibraryHeader onClose={onClose} title="Media" t={t} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the title inside an h1', () => {
    render(<MediaLibraryHeader onClose={vi.fn()} title="Media Library" t={t} />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.tagName).toBe('H1');
    expect(heading.textContent).toBe('Media Library');
  });

  it.each([
    ['true', true],
    ['false', false],
    ['undefined', undefined],
  ])('renders the title when isPrivate is %s', (_label, isPrivate) => {
    render(<MediaLibraryHeader onClose={vi.fn()} title="Media Library" isPrivate={isPrivate} t={t} />);

    expect(screen.getByText('Media Library')).toBeTruthy();
  });
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LaikaMediaLibraryCard from '@/laika-app/LaikaMediaLibraryCard';

const baseProps = {
  text: 'hero.png',
  onClick: vi.fn(),
  draftText: 'Draft',
  width: '280px',
  height: '240px',
  margin: '0px',
  type: 'png',
  isViewableImage: true,
  loadDisplayURL: vi.fn(),
};

describe('LaikaMediaLibraryCard', () => {
  it('renders the file name caption', () => {
    const { getByText } = render(<LaikaMediaLibraryCard {...baseProps} displayURL={{}} />);
    expect(getByText('hero.png')).toBeInTheDocument();
  });

  it('renders the image when a displayURL is available', () => {
    const { getByRole } = render(
      <LaikaMediaLibraryCard {...baseProps} displayURL={{ url: 'asset://hero.png' }} />,
    );
    const img = getByRole('img') as HTMLImageElement;
    expect(img.src).toContain('asset://hero.png');
    expect(img.alt).toBe('hero.png');
  });

  it('falls back to a file-type placeholder when not viewable', () => {
    const { getByText, queryByRole } = render(
      <LaikaMediaLibraryCard {...baseProps} isViewableImage={false} displayURL={{}} />,
    );
    expect(queryByRole('img')).toBeNull();
    expect(getByText('png')).toBeInTheDocument();
  });

  it('shows the draft badge when isDraft is true', () => {
    const { getByText } = render(<LaikaMediaLibraryCard {...baseProps} displayURL={{}} isDraft />);
    expect(getByText('Draft')).toBeInTheDocument();
  });

  it('fires onClick when the card is clicked', () => {
    const onClick = vi.fn();
    const { getByRole } = render(
      <LaikaMediaLibraryCard {...baseProps} displayURL={{}} onClick={onClick} />,
    );
    fireEvent.click(getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls loadDisplayURL on mount when no URL is available yet', () => {
    const loadDisplayURL = vi.fn();
    render(
      <LaikaMediaLibraryCard {...baseProps} displayURL={{}} loadDisplayURL={loadDisplayURL} />,
    );
    expect(loadDisplayURL).toHaveBeenCalledTimes(1);
  });
});

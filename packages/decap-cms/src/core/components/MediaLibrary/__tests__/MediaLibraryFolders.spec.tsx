import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import MediaLibraryFolders from '@/core/components/MediaLibrary/MediaLibraryFolders';
import { I18n } from '@/core/i18n';
import en from '@/locales/en/index';

import type { MediaLibraryFolderItem } from '@/core/components/MediaLibrary/MediaLibraryFolders';

const regionLabel = en.mediaLibrary.mediaLibraryFolders.regionLabel;

const folders: MediaLibraryFolderItem[] = [
  { path: 'images/blog', name: 'blog' },
  { path: 'images/team', name: 'team' },
];

function renderFolders(
  items: MediaLibraryFolderItem[],
  onNavigate: (path: string) => void = vi.fn(),
) {
  return render(
    <I18n locale="en" messages={en}>
      <MediaLibraryFolders folders={items} onNavigate={onNavigate} />
    </I18n>,
  );
}

describe('MediaLibraryFolders', () => {
  it('renders nothing for an empty list', () => {
    const { container } = renderFolders([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('labels the region via the locale key', () => {
    renderFolders(folders);
    expect(regionLabel).toBeTruthy();
    expect(screen.getByLabelText(regionLabel)).toBeInTheDocument();
  });

  it('renders one button per folder showing its name', () => {
    renderFolders(folders);
    const buttons = screen.getAllByRole('button');

    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent('blog');
    expect(buttons[1]).toHaveTextContent('team');
  });

  it('calls onNavigate with the folder path on click', () => {
    const onNavigate = vi.fn();
    renderFolders(folders, onNavigate);

    fireEvent.click(screen.getByRole('button', { name: /team/ }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenLastCalledWith('images/team');
  });
});

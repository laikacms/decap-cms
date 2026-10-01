import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import MediaLibraryAssetCollections from '@/core/components/MediaLibrary/MediaLibraryAssetCollections';

import type { CmsAssetCollection } from '@/lib/util/index';

const collections: CmsAssetCollection[] = [
  { name: 'products', label: 'Product photos', media_folder: 'static/products' },
  { name: 'team', label: 'Team headshots', media_folder: 'static/team' },
];

describe('MediaLibraryAssetCollections', () => {
  it('renders nothing when no asset collections are configured', () => {
    const { container } = render(
      <MediaLibraryAssetCollections assetCollections={[]} onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one labelled button per collection inside an "Asset collections" group', () => {
    render(<MediaLibraryAssetCollections assetCollections={collections} onSelect={vi.fn()} />);
    const group = screen.getByLabelText('Asset collections');
    const buttons = Array.from(group.querySelectorAll('button'));
    expect(buttons.map(b => b.textContent)).toEqual(['Product photos', 'Team headshots']);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('marks only the active collection as pressed', () => {
    render(
      <MediaLibraryAssetCollections
        assetCollections={collections}
        activeCollectionName="team"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Team headshots' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Product photos' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('marks no collection as pressed when activeCollectionName is undefined', () => {
    render(<MediaLibraryAssetCollections assetCollections={collections} onSelect={vi.fn()} />);
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('calls onSelect once with the exact collection object on click', () => {
    const onSelect = vi.fn();
    render(<MediaLibraryAssetCollections assetCollections={collections} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Team headshots' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toBe(collections[1]);
  });
});

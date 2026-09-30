import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import MediaLibraryBreadcrumbs from '@/core/components/MediaLibrary/MediaLibraryBreadcrumbs';
import { I18n } from '@/core/i18n';
import en from '@/locales/en/index';

const regionLabel = en.mediaLibrary.mediaLibraryBreadcrumbs.regionLabel;

const trail = [
  { label: 'Media', path: '' },
  { label: 'images', path: 'images' },
  { label: 'blog', path: 'images/blog' },
];

function renderBreadcrumbs(
  breadcrumbs: { label: string; path: string }[],
  onNavigate: (path: string) => void = vi.fn(),
) {
  return render(
    <I18n locale="en" messages={en}>
      <MediaLibraryBreadcrumbs breadcrumbs={breadcrumbs} onNavigate={onNavigate} />
    </I18n>,
  );
}

describe('MediaLibraryBreadcrumbs', () => {
  it('renders nothing for zero crumbs', () => {
    const { container } = renderBreadcrumbs([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a single crumb', () => {
    const { container } = renderBreadcrumbs([trail[0]]);
    expect(container).toBeEmptyDOMElement();
  });

  it('labels the region via the locale key', () => {
    renderBreadcrumbs(trail);
    expect(regionLabel).toBeTruthy();
    expect(screen.getByLabelText(regionLabel)).toBeInTheDocument();
  });

  it('disables only the last crumb and marks it aria-current=page', () => {
    renderBreadcrumbs(trail);
    const [root, images, blog] = screen.getAllByRole('button');

    expect(root).toBeEnabled();
    expect(images).toBeEnabled();
    expect(blog).toBeDisabled();
    expect(blog).toHaveAttribute('aria-current', 'page');
    expect(root).not.toHaveAttribute('aria-current');
    expect(images).not.toHaveAttribute('aria-current');
  });

  it('hides separators from assistive tech', () => {
    const { container } = renderBreadcrumbs(trail);
    const separators = container.querySelectorAll('[aria-hidden="true"]');
    expect(separators).toHaveLength(2);
    separators.forEach(separator => expect(separator).toHaveTextContent('/'));
  });

  it('calls onNavigate with the crumb path for non-current crumbs', () => {
    const onNavigate = vi.fn();
    renderBreadcrumbs(trail, onNavigate);

    fireEvent.click(screen.getByRole('button', { name: 'images' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenLastCalledWith('images');
  });

  it('navigates with an empty path for the root crumb', () => {
    const onNavigate = vi.fn();
    renderBreadcrumbs(trail, onNavigate);

    fireEvent.click(screen.getByRole('button', { name: 'Media' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenLastCalledWith('');
  });

  it('does not call onNavigate when clicking the current crumb', () => {
    const onNavigate = vi.fn();
    renderBreadcrumbs(trail, onNavigate);

    fireEvent.click(screen.getByRole('button', { name: 'blog' }));
    expect(onNavigate).not.toHaveBeenCalled();
  });
});

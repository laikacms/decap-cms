import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  useTranslate: () => (key: string) => key,
}));

import LaikaMediaLibraryTop from '@/laika-app/LaikaMediaLibraryTop';

const baseProps = {
  onClose: vi.fn(),
  privateUpload: false,
  forImage: true,
  onDownload: vi.fn(),
  onUpload: vi.fn(),
  query: '',
  onSearchChange: vi.fn(),
  onSearchKeyDown: vi.fn(),
  searchDisabled: false,
  onDelete: vi.fn(),
  canInsert: true,
  onInsert: vi.fn(),
  hasSelection: false,
  isPersisting: false,
  isDeleting: false,
};

describe('LaikaMediaLibraryTop', () => {
  it('renders the images title + close button', () => {
    const { getByText, getByLabelText } = render(<LaikaMediaLibraryTop {...baseProps} />);
    expect(getByText('mediaLibrary.mediaLibraryModal.images')).toBeInTheDocument();
    expect(getByLabelText('Close')).toBeInTheDocument();
  });

  it('renders the private badge when privateUpload is true', () => {
    const { getByText } = render(<LaikaMediaLibraryTop {...baseProps} privateUpload />);
    expect(getByText('mediaLibrary.mediaLibraryModal.private')).toBeInTheDocument();
  });

  it('disables delete + download + insert when no selection', () => {
    const { getByText } = render(<LaikaMediaLibraryTop {...baseProps} />);
    expect(getByText('mediaLibrary.mediaLibraryModal.download').closest('button')).toBeDisabled();
    expect(
      getByText('mediaLibrary.mediaLibraryModal.deleteSelected').closest('button'),
    ).toBeDisabled();
    expect(
      getByText('mediaLibrary.mediaLibraryModal.chooseSelected').closest('button'),
    ).toBeDisabled();
  });

  it('enables delete + download when hasSelection is true', () => {
    const { getByText } = render(<LaikaMediaLibraryTop {...baseProps} hasSelection />);
    expect(
      getByText('mediaLibrary.mediaLibraryModal.download').closest('button'),
    ).not.toBeDisabled();
    expect(
      getByText('mediaLibrary.mediaLibraryModal.deleteSelected').closest('button'),
    ).not.toBeDisabled();
  });

  it('fires onClose when close button clicked', () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(<LaikaMediaLibraryTop {...baseProps} onClose={onClose} />);
    fireEvent.click(getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omits the Insert button when canInsert is false', () => {
    const { queryByText } = render(<LaikaMediaLibraryTop {...baseProps} canInsert={false} />);
    expect(queryByText('mediaLibrary.mediaLibraryModal.chooseSelected')).toBeNull();
  });
});

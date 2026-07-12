import React from 'react';
import { render } from '@testing-library/react';

import MediaLibraryTop from '../MediaLibraryTop';

describe('MediaLibraryTop', () => {
  const baseProps = {
    t: key => key,
    onClose: jest.fn(),
    onDownload: jest.fn(),
    onUpload: jest.fn(),
    onSearchChange: jest.fn(),
    onSearchKeyDown: jest.fn(),
    searchDisabled: false,
    onDelete: jest.fn(),
    onInsert: jest.fn(),
    hasSelection: false,
    selectedFile: {},
  };

  function getUploadInput(container) {
    return container.querySelector('input[type="file"]');
  }

  describe('shouldShowButtonLoader / uploadEnabled', () => {
    it('enables the upload button when neither persisting nor deleting', () => {
      const { container } = render(
        <MediaLibraryTop {...baseProps} isPersisting={false} isDeleting={false} />,
      );

      expect(getUploadInput(container)).not.toBeDisabled();
    });

    it('disables the upload button while persisting', () => {
      const { container } = render(
        <MediaLibraryTop {...baseProps} isPersisting isDeleting={false} />,
      );

      expect(getUploadInput(container)).toBeDisabled();
    });

    it('disables the upload button while deleting', () => {
      const { container } = render(
        <MediaLibraryTop {...baseProps} isPersisting={false} isDeleting />,
      );

      expect(getUploadInput(container)).toBeDisabled();
    });

    it('disables the upload button while both persisting and deleting', () => {
      const { container } = render(<MediaLibraryTop {...baseProps} isPersisting isDeleting />);

      expect(getUploadInput(container)).toBeDisabled();
    });
  });

  describe('deleteEnabled', () => {
    it('disables the delete button when there is no selection, even when idle', () => {
      const { getByText } = render(
        <MediaLibraryTop
          {...baseProps}
          hasSelection={false}
          isPersisting={false}
          isDeleting={false}
        />,
      );

      expect(getByText('mediaLibrary.mediaLibraryModal.deleteSelected')).toBeDisabled();
    });

    it('enables the delete button when there is a selection and nothing is in progress', () => {
      const { getByText } = render(
        <MediaLibraryTop {...baseProps} hasSelection isPersisting={false} isDeleting={false} />,
      );

      expect(getByText('mediaLibrary.mediaLibraryModal.deleteSelected')).not.toBeDisabled();
    });

    it('disables the delete button when persisting even with a selection', () => {
      const { getByText } = render(
        <MediaLibraryTop {...baseProps} hasSelection isPersisting isDeleting={false} />,
      );

      expect(getByText('mediaLibrary.mediaLibraryModal.deleteSelected')).toBeDisabled();
    });

    it('disables the delete button when deleting even with a selection', () => {
      const { getByText } = render(
        <MediaLibraryTop {...baseProps} hasSelection isPersisting={false} isDeleting />,
      );

      expect(getByText('mediaLibrary.mediaLibraryModal.deleting')).toBeDisabled();
    });
  });

  describe('label swapping', () => {
    it('shows the normal upload label when not persisting', () => {
      const { getByText, queryByText } = render(
        <MediaLibraryTop {...baseProps} isPersisting={false} />,
      );

      expect(getByText('mediaLibrary.mediaLibraryModal.upload')).toBeInTheDocument();
      expect(queryByText('mediaLibrary.mediaLibraryModal.uploading')).not.toBeInTheDocument();
    });

    it('shows the in-progress upload label while persisting', () => {
      const { getByText, queryByText } = render(<MediaLibraryTop {...baseProps} isPersisting />);

      expect(getByText('mediaLibrary.mediaLibraryModal.uploading')).toBeInTheDocument();
      expect(queryByText('mediaLibrary.mediaLibraryModal.upload')).not.toBeInTheDocument();
    });

    it('shows the normal delete label when not deleting', () => {
      const { getByText, queryByText } = render(
        <MediaLibraryTop {...baseProps} isDeleting={false} />,
      );

      expect(getByText('mediaLibrary.mediaLibraryModal.deleteSelected')).toBeInTheDocument();
      expect(queryByText('mediaLibrary.mediaLibraryModal.deleting')).not.toBeInTheDocument();
    });

    it('shows the in-progress delete label while deleting', () => {
      const { getByText, queryByText } = render(<MediaLibraryTop {...baseProps} isDeleting />);

      expect(getByText('mediaLibrary.mediaLibraryModal.deleting')).toBeInTheDocument();
      expect(queryByText('mediaLibrary.mediaLibraryModal.deleteSelected')).not.toBeInTheDocument();
    });
  });

  describe('InsertButton', () => {
    const insertLabel = 'mediaLibrary.mediaLibraryModal.chooseSelected';

    it('does not render when canInsert is false', () => {
      const { queryByText } = render(<MediaLibraryTop {...baseProps} canInsert={false} />);

      expect(queryByText(insertLabel)).not.toBeInTheDocument();
    });

    it('does not render when canInsert is not provided', () => {
      const { queryByText } = render(<MediaLibraryTop {...baseProps} />);

      expect(queryByText(insertLabel)).not.toBeInTheDocument();
    });

    it('renders when canInsert is true', () => {
      const { getByText } = render(<MediaLibraryTop {...baseProps} canInsert />);

      expect(getByText(insertLabel)).toBeInTheDocument();
    });

    it('is disabled when canInsert is true but there is no selection', () => {
      const { getByText } = render(
        <MediaLibraryTop {...baseProps} canInsert hasSelection={false} />,
      );

      expect(getByText(insertLabel)).toBeDisabled();
    });

    it('is enabled when canInsert is true and there is a selection', () => {
      const { getByText } = render(<MediaLibraryTop {...baseProps} canInsert hasSelection />);

      expect(getByText(insertLabel)).not.toBeDisabled();
    });
  });
});

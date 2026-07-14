import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LaikaDialog from '@/laika-app/ui/LaikaDialog';

describe('LaikaDialog', () => {
  it('renders the title and children when open', () => {
    const { getByText } = render(
      <LaikaDialog isOpen onClose={vi.fn()} title="Confirm delete">
        <LaikaDialog.Body>This cannot be undone.</LaikaDialog.Body>
      </LaikaDialog>,
    );
    expect(getByText('Confirm delete')).toBeInTheDocument();
    expect(getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('shows a close button by default and fires onClose when clicked', () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(
      <LaikaDialog isOpen onClose={onClose} title="Title">
        <div>body</div>
      </LaikaDialog>,
    );
    fireEvent.click(getByLabelText('Close dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omits the close button when showCloseButton=false', () => {
    const { queryByLabelText } = render(
      <LaikaDialog isOpen onClose={vi.fn()} title="Title" showCloseButton={false}>
        <div>body</div>
      </LaikaDialog>,
    );
    expect(queryByLabelText('Close dialog')).toBeNull();
  });

  it('does not render contents when isOpen=false', () => {
    const { queryByText } = render(
      <LaikaDialog isOpen={false} onClose={vi.fn()} title="Hidden">
        <div>body</div>
      </LaikaDialog>,
    );
    expect(queryByText('body')).toBeNull();
  });
});

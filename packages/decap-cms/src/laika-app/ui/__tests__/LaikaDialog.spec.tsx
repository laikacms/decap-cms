import { fireEvent, render } from '@testing-library/react';
import React from 'react';
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

  it('fires onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    const { getByRole } = render(
      <LaikaDialog isOpen onClose={onClose} title="Title">
        <div>body</div>
      </LaikaDialog>,
    );
    fireEvent.keyDown(getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('labels the dialog with ariaLabel when there is no title', () => {
    const { getByRole } = render(
      <LaikaDialog isOpen onClose={vi.fn()} ariaLabel="Command palette" showCloseButton={false}>
        <div>body</div>
      </LaikaDialog>,
    );
    expect(getByRole('dialog')).toHaveAttribute('aria-label', 'Command palette');
  });

  it('labels the dialog via aria-labelledby when a title is set', () => {
    const { getByRole, getByText } = render(
      <LaikaDialog isOpen onClose={vi.fn()} title="Confirm delete">
        <div>body</div>
      </LaikaDialog>,
    );
    const dialog = getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', getByText('Confirm delete').id);
  });
});

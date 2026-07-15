import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from '@/core/components/UI/Modal';

describe('Modal', () => {
  it('renders children in a dialog when open', () => {
    const { getByText, getByRole } = render(
      <Modal isOpen onClose={vi.fn()}>
        <div>modal content</div>
      </Modal>,
    );
    expect(getByRole('dialog')).toBeInTheDocument();
    expect(getByText('modal content')).toBeInTheDocument();
  });

  it('does not render contents when isOpen=false', () => {
    const { queryByText, queryByRole } = render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <div>modal content</div>
      </Modal>,
    );
    expect(queryByRole('dialog')).toBeNull();
    expect(queryByText('modal content')).toBeNull();
  });

  it('fires onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    const { getByRole } = render(
      <Modal isOpen onClose={onClose}>
        <div>modal content</div>
      </Modal>,
    );
    fireEvent.keyDown(getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies a consumer className to the dialog popup', () => {
    const { getByRole } = render(
      <Modal isOpen onClose={vi.fn()} className="custom-modal">
        <div>modal content</div>
      </Modal>,
    );
    expect(getByRole('dialog')).toHaveClass('custom-modal');
  });

  it('portals into #nc-root when it exists', () => {
    const root = document.createElement('div');
    root.id = 'nc-root';
    document.body.appendChild(root);
    try {
      const { getByRole } = render(
        <Modal isOpen onClose={vi.fn()}>
          <div>modal content</div>
        </Modal>,
      );
      expect(root.contains(getByRole('dialog'))).toBe(true);
    } finally {
      root.remove();
    }
  });
});

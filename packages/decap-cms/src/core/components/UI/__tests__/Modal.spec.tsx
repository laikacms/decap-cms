import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
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

  it('DCMS-1241: a single outside-press both closes the modal and activates the link underneath it', async () => {
    // Regression test for: with the modal open, clicking a sidebar link
    // closed the modal but did not navigate — the backdrop absorbed the
    // click, and the link only received a click on a *second* press.
    const onClose = vi.fn();
    const onLinkClick = vi.fn();

    const link = document.createElement('a');
    link.href = '/collections/posts';
    link.textContent = 'Posts';
    // Prevent jsdom's "not implemented: navigation" noise; only the click
    // firing (which a real router Link would intercept) matters here.
    link.addEventListener('click', event => event.preventDefault());
    link.addEventListener('click', onLinkClick);
    document.body.appendChild(link);

    // jsdom has no layout engine, so elementFromPoint always returns null.
    // Stub it to simulate the link being the element visually underneath
    // the backdrop at the click coordinates, exactly like a real browser
    // would report once the backdrop is removed from the DOM.
    // jsdom doesn't implement elementFromPoint at all.
    document.elementFromPoint ??= () => null;
    const elementFromPointSpy = vi.spyOn(document, 'elementFromPoint').mockReturnValue(link);

    try {
      const { getByTestId } = render(
        <Modal isOpen onClose={onClose}>
          <div>modal content</div>
        </Modal>,
      );

      fireEvent.click(getByTestId('modal-backdrop'), { clientX: 42, clientY: 7 });

      expect(onClose).toHaveBeenCalledTimes(1);

      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve));
      });

      await waitFor(() => expect(onLinkClick).toHaveBeenCalledTimes(1));
      expect(elementFromPointSpy).toHaveBeenCalledWith(42, 7);
    } finally {
      elementFromPointSpy.mockRestore();
      link.remove();
    }
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

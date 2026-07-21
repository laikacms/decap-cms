import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Modal, replayOutsidePress } from '@/core/components/UI/Modal';

import type { DialogRoot } from '@base-ui/react/dialog';

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
        // The replay waits two animation frames (DCMS-1251), so flush both.
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => requestAnimationFrame(resolve));
      });

      await waitFor(() => expect(onLinkClick).toHaveBeenCalledTimes(1));
      expect(elementFromPointSpy).toHaveBeenCalledWith(42, 7);
    } finally {
      elementFromPointSpy.mockRestore();
      link.remove();
    }
  });

  it('DCMS-1251: replay waits until the portal wrapper has actually left the DOM before clicking the link underneath it', async () => {
    // Regression test for: replayOutsidePress ran its elementFromPoint check
    // inside a single requestAnimationFrame, which is not guaranteed to run
    // *after* the portal wrapper has actually been removed from the DOM —
    // only after the browser's next paint is requested. This test builds a
    // real DOM fixture (a wrapper element sitting over a real link) and
    // removes the wrapper for real, mid-flight, using rAF scheduling order
    // to model "the removal completes sometime during the frame following
    // the outside-press, but not necessarily before every callback queued
    // for that frame" — exactly the race described in the issue. Unlike the
    // DCMS-1241 test above, elementFromPoint here is not stubbed to a fixed
    // value: it reflects the fixture's real, current DOM state at call time.
    const onLinkClick = vi.fn();

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-testid', 'portal-wrapper');
    document.body.appendChild(wrapper);

    const link = document.createElement('a');
    link.href = '/collections/posts';
    link.textContent = 'Posts';
    link.addEventListener('click', event => event.preventDefault());
    link.addEventListener('click', onLinkClick);
    document.body.appendChild(link);

    document.elementFromPoint ??= () => null;
    const elementFromPointSpy = vi.spyOn(document, 'elementFromPoint').mockImplementation(() => {
      // A real hit-test at the click coordinates lands on the portal
      // wrapper for as long as it is still attached to the document, and
      // only on the link once the wrapper has actually been removed.
      return wrapper.isConnected ? wrapper : link;
    });

    try {
      const eventDetails = {
        reason: 'outside-press',
        event: { clientX: 42, clientY: 7 },
      } as unknown as DialogRoot.ChangeEventDetails;

      // Removal is scheduled via requestAnimationFrame *after* the replay
      // is triggered below, so within the frame following the outside-press
      // both this removal callback and replayOutsidePress's own rAF
      // callback are queued, in that relative order. A single-rAF replay
      // would therefore run its elementFromPoint check *before* the wrapper
      // is removed (registered first, so it runs first); the double-rAF
      // replay defers its check to the following frame, by which point
      // removal has already happened.
      replayOutsidePress(eventDetails);
      requestAnimationFrame(() => wrapper.remove());

      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve));
      });
      // Sanity check on the fixture itself: after just one frame the
      // wrapper is gone (it was scheduled to be removed within that frame),
      // but the replay must not have run its check yet — it's still
      // waiting for the second frame.
      expect(wrapper.isConnected).toBe(false);
      expect(onLinkClick).not.toHaveBeenCalled();

      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve));
      });
      await waitFor(() => expect(onLinkClick).toHaveBeenCalledTimes(1));
      expect(elementFromPointSpy).toHaveLastReturnedWith(link);
    } finally {
      elementFromPointSpy.mockRestore();
      link.remove();
      wrapper.remove();
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

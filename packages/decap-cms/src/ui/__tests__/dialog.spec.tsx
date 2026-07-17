import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/ui/Dialog';

/**
 * Pinning behavior spec for `src/ui/dialog.ts` (currently a thin re-export
 * of `src/lib/widgets/editor/ui/dialog.tsx`, see `src/ui/README.md`).
 * Covers the behavior contract the README's "How to add a new primitive"
 * section requires: keyboard interaction, ARIA attributes, and
 * controlled/uncontrolled state. Filed under DCMS-600.
 */
describe('Dialog', () => {
  describe('uncontrolled (defaultOpen / internal state)', () => {
    it('starts closed by default and opens when the trigger is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Delete item</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogContent>
        </Dialog>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.click(screen.getByText('Open'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Delete item')).toBeInTheDocument();
    });

    it('closes when DialogClose is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Delete item</DialogTitle>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.click(screen.getByText('Cancel'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes the built-in close button and it is reachable by its accessible name', async () => {
      const user = userEvent.setup();
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Delete item</DialogTitle>
          </DialogContent>
        </Dialog>,
      );

      await user.click(screen.getByRole('button', { name: 'Close' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('controlled (open / onOpenChange)', () => {
    it('reflects the open prop rather than internal state', () => {
      const { rerender } = render(
        <Dialog open={false} onOpenChange={vi.fn()}>
          <DialogContent>
            <DialogTitle>Controlled</DialogTitle>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(
        <Dialog open onOpenChange={vi.fn()}>
          <DialogContent>
            <DialogTitle>Controlled</DialogTitle>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('calls onOpenChange instead of closing itself when the trigger/close fire', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const { rerender } = render(
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent showCloseButton={false}>
            <DialogTitle>Controlled</DialogTitle>
            <DialogFooter>
              <DialogClose>Close</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>,
      );

      await user.click(screen.getByText('Close'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
      // Consumer owns the open state; without a prop update the dialog stays open.
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(
        <Dialog open={false} onOpenChange={onOpenChange}>
          <DialogContent showCloseButton={false}>
            <DialogTitle>Controlled</DialogTitle>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('keyboard interaction', () => {
    it('closes on Escape and reports the change via onOpenChange when controlled', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <Dialog defaultOpen onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogTitle>Escape me</DialogTitle>
          </DialogContent>
        </Dialog>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('ARIA attributes', () => {
    it('exposes role=dialog labelled/described by the title and description', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Delete item</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogContent>
        </Dialog>,
      );

      const dialog = screen.getByRole('dialog');
      const title = screen.getByText('Delete item');
      const description = screen.getByText('This cannot be undone.');

      expect(dialog).toHaveAttribute('aria-labelledby', title.id);
      expect(dialog).toHaveAttribute('aria-describedby', description.id);
      // No aria-modal assertion: Base UI conveys modality by making outside
      // content inert rather than via aria-modal (react-modal's approach).
      expect(title.id).toBeTruthy();
      expect(description.id).toBeTruthy();
    });
  });
});

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditorToolbar } from '@/core/components/Editor/EditorToolbar';
import { status } from '@/core/constants/publishModes';

import type { CmsCollectionState } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

vi.mock('../../UI', () => ({
  SettingsDropdown: (props: Record<string, unknown>) => <div data-testid="settings-dropdown" {...props} />,
}));
vi.mock('../../../routing/Link', () => {
  return {
    Link: (props: Record<string, unknown>) => <div data-testid="link" {...props} />,
  };
});

describe('EditorToolbar', () => {
  const props = {
    isPersisting: false,
    isPublishing: false,
    isUpdatingStatus: false,
    isDeleting: false,
    onPersist: vi.fn(),
    onPersistAndNew: vi.fn(),
    onPersistAndDuplicate: vi.fn(),
    showDelete: true,
    onDelete: vi.fn(),
    onDeleteUnpublishedChanges: vi.fn(),
    onChangeStatus: vi.fn(),
    onPublish: vi.fn(),
    unPublish: vi.fn(),
    onDuplicate: vi.fn(),
    onPublishAndNew: vi.fn(),
    onPublishAndDuplicate: vi.fn(),
    hasChanged: false,
    collection: { name: 'posts' } as unknown as CmsCollectionState,
    hasWorkflow: false,
    useOpenAuthoring: false,
    hasUnpublishedChanges: false,
    isNewEntry: false,
    isModification: false,
    onLogoutClick: vi.fn(),
    loadDeployPreview: vi.fn(),
    t: vi.fn((key: string) => key) as unknown as TranslateFunction,
    editorBackLink: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deploy preview polling', () => {
    it('should poll with maxAttempts: 24 and an AbortSignal on mount for existing entries', () => {
      render(<EditorToolbar {...props} isNewEntry={false} />);
      expect(props.loadDeployPreview).toHaveBeenCalledTimes(1);
      const opts = props.loadDeployPreview.mock.calls[0][0];
      expect(opts.maxAttempts).toBe(24);
      expect(opts.signal).toBeInstanceOf(AbortSignal);
    });

    it('should not poll on mount for new entries', () => {
      render(<EditorToolbar {...props} isNewEntry={true} />);
      expect(props.loadDeployPreview).not.toHaveBeenCalled();
    });

    it('should poll with maxAttempts: 3 after a save completes', () => {
      const { rerender } = render(<EditorToolbar {...props} isPersisting={true} />);
      props.loadDeployPreview.mockClear();
      rerender(<EditorToolbar {...props} isPersisting={false} />);
      expect(props.loadDeployPreview).toHaveBeenCalledTimes(1);
      const opts = props.loadDeployPreview.mock.calls[0][0];
      expect(opts.maxAttempts).toBe(3);
      expect(opts.signal).toBeInstanceOf(AbortSignal);
    });

    it('should abort polling on unmount', () => {
      const { unmount } = render(<EditorToolbar {...props} isNewEntry={false} />);
      const signal = props.loadDeployPreview.mock.calls[0][0].signal;
      expect(signal.aborted).toBe(false);
      unmount();
      expect(signal.aborted).toBe(true);
    });

    it('should abort previous poll when a new save triggers a new poll', () => {
      const { rerender } = render(<EditorToolbar {...props} isPersisting={false} />);
      const firstSignal = props.loadDeployPreview.mock.calls[0][0].signal;

      // Simulate save completing
      rerender(<EditorToolbar {...props} isPersisting={true} />);
      rerender(<EditorToolbar {...props} isPersisting={false} />);

      expect(firstSignal.aborted).toBe(true);
      const secondSignal = props.loadDeployPreview.mock.calls[1][0].signal;
      expect(secondSignal.aborted).toBe(false);
    });
  });

  describe('back status label (DCMS-612)', () => {
    it('shows no status label on a pristine new entry', () => {
      render(<EditorToolbar {...props} isNewEntry={true} hasChanged={false} />);
      expect(screen.queryByText('editor.editorToolbar.changesSaved')).not.toBeInTheDocument();
      expect(screen.queryByText('editor.editorToolbar.unsavedChanges')).not.toBeInTheDocument();
    });

    it('shows unsaved changes on a dirty new entry', () => {
      render(<EditorToolbar {...props} isNewEntry={true} hasChanged={true} />);
      expect(screen.getByText('editor.editorToolbar.unsavedChanges')).toBeInTheDocument();
    });

    it('shows changes saved on a clean existing entry', () => {
      render(<EditorToolbar {...props} isNewEntry={false} hasChanged={false} />);
      expect(screen.getByText('editor.editorToolbar.changesSaved')).toBeInTheDocument();
    });

    it('shows unsaved changes on a dirty existing entry', () => {
      render(<EditorToolbar {...props} isNewEntry={false} hasChanged={true} />);
      expect(screen.getByText('editor.editorToolbar.unsavedChanges')).toBeInTheDocument();
    });

    it('exposes the "unsavedChanges" indicator as a role="status" live region (DCMS-1782)', () => {
      render(<EditorToolbar {...props} isNewEntry={false} hasChanged={true} />);
      expect(screen.getByRole('status')).toHaveTextContent('editor.editorToolbar.unsavedChanges');
    });

    it('exposes the "changesSaved" indicator as a role="status" live region (DCMS-1782)', () => {
      render(<EditorToolbar {...props} isNewEntry={false} hasChanged={false} />);
      expect(screen.getByRole('status')).toHaveTextContent('editor.editorToolbar.changesSaved');
    });

    it('keeps the same status live region across a dirty <-> clean transition (DCMS-1782)', () => {
      const { rerender } = render(
        <EditorToolbar {...props} isNewEntry={false} hasChanged={true} />,
      );
      expect(screen.getByRole('status')).toHaveTextContent('editor.editorToolbar.unsavedChanges');

      rerender(<EditorToolbar {...props} isNewEntry={false} hasChanged={false} />);
      expect(screen.getByRole('status')).toHaveTextContent('editor.editorToolbar.changesSaved');
    });
  });

  describe('Save button (editorial workflow)', () => {
    it('hides mutation controls when the user lacks the collection edit scope', () => {
      render(
        <EditorToolbar
          {...props}
          collection={{
            ...props.collection,
            create: true,
            edit_scopes: ['content:write'],
          }}
          user={{ name: 'Viewer', token: '', scopes: ['content:read'] }}
          hasWorkflow={false}
          isNewEntry={false}
          hasChanged
        />,
      );

      expect(screen.queryByText('editor.editorToolbar.publish')).not.toBeInTheDocument();
      expect(screen.queryByText('editor.editorToolbar.deleteEntry')).not.toBeInTheDocument();
    });

    it('is enabled on a pristine new entry so validation can surface (#757)', () => {
      render(
        <EditorToolbar {...props} hasWorkflow={true} isNewEntry={true} hasChanged={false} />,
      );
      expect(screen.getByRole('button', { name: 'editor.editorToolbar.save' })).toBeEnabled();
    });

    it('stays disabled on an unchanged existing entry', () => {
      render(
        <EditorToolbar {...props} hasWorkflow={true} isNewEntry={false} hasChanged={false} />,
      );
      expect(screen.getByRole('button', { name: 'editor.editorToolbar.save' })).toBeDisabled();
    });

    it('is enabled on a changed existing entry', () => {
      render(
        <EditorToolbar {...props} hasWorkflow={true} isNewEntry={false} hasChanged={true} />,
      );
      expect(screen.getByRole('button', { name: 'editor.editorToolbar.save' })).toBeEnabled();
    });
  });

  describe('Cmd/Ctrl+S save shortcut (DCMS-NEW-SAVE-SHORTCUT)', () => {
    function press(init: Partial<KeyboardEventInit> = {}) {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
        cancelable: true,
        ...init,
      });
      act(() => {
        window.dispatchEvent(event);
      });
      return event;
    }

    it('invokes onPersist and prevents the browser default on a saveable entry (Cmd+S)', () => {
      render(
        <EditorToolbar {...props} hasWorkflow={true} isNewEntry={false} hasChanged={true} />,
      );
      const event = press({ metaKey: true });
      expect(event.defaultPrevented).toBe(true);
      expect(props.onPersist).toHaveBeenCalledTimes(1);
    });

    it('invokes onPersist on Ctrl+S too', () => {
      render(
        <EditorToolbar {...props} hasWorkflow={true} isNewEntry={false} hasChanged={true} />,
      );
      press({ metaKey: false, ctrlKey: true });
      expect(props.onPersist).toHaveBeenCalledTimes(1);
    });

    it('fires even while focus is inside a form input', () => {
      render(
        <EditorToolbar {...props} hasWorkflow={true} isNewEntry={false} hasChanged={true} />,
      );
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true, cancelable: true }),
      );
      expect(props.onPersist).toHaveBeenCalledTimes(1);
      input.remove();
    });

    it('is a no-op when the entry is not dirty (nothing to save)', () => {
      render(
        <EditorToolbar {...props} hasWorkflow={true} isNewEntry={false} hasChanged={false} />,
      );
      press();
      expect(props.onPersist).not.toHaveBeenCalled();
    });

    it('is a no-op while a save is already in flight', () => {
      render(
        <EditorToolbar {...props} hasWorkflow={true} isNewEntry={false} hasChanged={true} isPersisting={true} />,
      );
      press();
      expect(props.onPersist).not.toHaveBeenCalled();
    });

    it('does not register the shortcut for non-workflow collections (no Save button rendered)', () => {
      render(
        <EditorToolbar {...props} hasWorkflow={false} isNewEntry={false} hasChanged={true} />,
      );
      press();
      expect(props.onPersist).not.toHaveBeenCalled();
    });

    it('ignores plain "s" without a modifier key', () => {
      render(
        <EditorToolbar {...props} hasWorkflow={true} isNewEntry={false} hasChanged={true} />,
      );
      press({ metaKey: false, ctrlKey: false });
      expect(props.onPersist).not.toHaveBeenCalled();
    });

    it('unregisters the shortcut on unmount', () => {
      const { unmount } = render(
        <EditorToolbar {...props} hasWorkflow={true} isNewEntry={false} hasChanged={true} />,
      );
      unmount();
      press();
      expect(props.onPersist).not.toHaveBeenCalled();
    });
  });

  describe('status dropdown a11y (DCMS-1470)', () => {
    it('exposes each status option as menuitemradio with aria-checked on the current status', async () => {
      const user = userEvent.setup();
      render(
        <EditorToolbar
          {...props}
          hasWorkflow={true}
          isNewEntry={false}
          currentStatus={status.PENDING_REVIEW}
        />,
      );

      await user.click(screen.getByRole('button', { name: /editor.editorToolbar.status/ }));

      const draft = await screen.findByRole('menuitemradio', { name: 'editor.editorToolbar.draft' });
      const inReview = screen.getByRole('menuitemradio', { name: 'editor.editorToolbar.inReview' });
      const ready = screen.getByRole('menuitemradio', { name: 'editor.editorToolbar.ready' });

      expect(draft).toHaveAttribute('aria-checked', 'false');
      expect(inReview).toHaveAttribute('aria-checked', 'true');
      expect(ready).toHaveAttribute('aria-checked', 'false');

      // No plain, state-less menuitem left over from the old markup.
      expect(screen.queryByRole('menuitem', { name: 'editor.editorToolbar.draft' })).not.toBeInTheDocument();
    });

    it('calls onChangeStatus with the same status keys as before when a radio item is clicked', async () => {
      const user = userEvent.setup();
      render(
        <EditorToolbar
          {...props}
          hasWorkflow={true}
          isNewEntry={false}
          currentStatus={status.DRAFT}
        />,
      );

      await user.click(screen.getByRole('button', { name: /editor.editorToolbar.status/ }));
      await user.click(await screen.findByRole('menuitemradio', { name: 'editor.editorToolbar.inReview' }));

      expect(props.onChangeStatus).toHaveBeenCalledWith('PENDING_REVIEW');
    });
  });
});

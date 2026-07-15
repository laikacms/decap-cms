import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditorToolbar } from '@/core/components/Editor/EditorToolbar';

import type { CmsCollectionState } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

vi.mock('../../UI', () => ({
  SettingsDropdown: (props: Record<string, unknown>) => (
    <div data-testid="settings-dropdown" {...props} />
  ),
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
  });

  describe('Save button (editorial workflow)', () => {
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
});

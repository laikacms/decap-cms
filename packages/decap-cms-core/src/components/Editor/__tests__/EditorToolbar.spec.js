import React from 'react';
import { render, screen } from '@testing-library/react';
import { fromJS } from 'immutable';

import { EditorToolbar } from '../EditorToolbar';

jest.mock('../../UI', () => ({
  // eslint-disable-next-line react/display-name
  SettingsDropdown: props => <mock-settings-dropdown {...props} />,
}));
jest.mock('react-router-dom', () => {
  return {
    // eslint-disable-next-line react/display-name
    Link: props => <mock-link {...props} />,
  };
});

describe('EditorToolbar', () => {
  const props = {
    isPersisting: false,
    isPublishing: false,
    isUpdatingStatus: false,
    isDeleting: false,
    onPersist: jest.fn(),
    onPersistAndNew: jest.fn(),
    onPersistAndDuplicate: jest.fn(),
    showDelete: true,
    onDelete: jest.fn(),
    onDeleteUnpublishedChanges: jest.fn(),
    onChangeStatus: jest.fn(),
    onPublish: jest.fn(),
    unPublish: jest.fn(),
    onDuplicate: jest.fn(),
    onPublishAndNew: jest.fn(),
    onPublishAndDuplicate: jest.fn(),
    hasChanged: false,
    collection: fromJS({ name: 'posts' }),
    hasWorkflow: false,
    useOpenAuthoring: false,
    hasUnpublishedChanges: false,
    isNewEntry: false,
    isModification: false,
    onLogoutClick: jest.fn(),
    loadDeployPreview: jest.fn(),
    t: jest.fn(key => key),
    editorBackLink: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with default props', () => {
    const { asFragment } = render(<EditorToolbar {...props} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('DCMS-547: status label matrix (isNewEntry x hasChanged)', () => {
    it('should show neither label for a pristine new entry (isNewEntry=true, hasChanged=false)', () => {
      render(<EditorToolbar {...props} isNewEntry={true} hasChanged={false} />);
      expect(screen.queryByText('editor.editorToolbar.unsavedChanges')).not.toBeInTheDocument();
      expect(screen.queryByText('editor.editorToolbar.changesSaved')).not.toBeInTheDocument();
    });

    it('should show "unsavedChanges" once a new entry actually changes (isNewEntry=true, hasChanged=true)', () => {
      render(<EditorToolbar {...props} isNewEntry={true} hasChanged={true} />);
      expect(screen.queryByText('editor.editorToolbar.changesSaved')).not.toBeInTheDocument();
      expect(screen.getByText('editor.editorToolbar.unsavedChanges')).toBeInTheDocument();
    });

    it('should show "changesSaved" for an existing, unchanged entry (isNewEntry=false, hasChanged=false)', () => {
      render(<EditorToolbar {...props} isNewEntry={false} hasChanged={false} />);
      expect(screen.queryByText('editor.editorToolbar.unsavedChanges')).not.toBeInTheDocument();
      expect(screen.getByText('editor.editorToolbar.changesSaved')).toBeInTheDocument();
    });

    it('should show "unsavedChanges" for an existing, modified entry (isNewEntry=false, hasChanged=true)', () => {
      render(<EditorToolbar {...props} isNewEntry={false} hasChanged={true} />);
      expect(screen.queryByText('editor.editorToolbar.changesSaved')).not.toBeInTheDocument();
      expect(screen.getByText('editor.editorToolbar.unsavedChanges')).toBeInTheDocument();
    });

    it('should enable the save button for a pristine new entry with workflow controls', () => {
      render(<EditorToolbar {...props} hasWorkflow={true} isNewEntry={true} hasChanged={false} />);
      expect(screen.getByText('editor.editorToolbar.save')).not.toBeDisabled();
    });
  });

  [false, true].forEach(useOpenAuthoring => {
    it(`should render with workflow controls hasUnpublishedChanges=true,isNewEntry=false,isModification=true,useOpenAuthoring=${useOpenAuthoring}`, () => {
      const { asFragment } = render(
        <EditorToolbar
          {...props}
          hasWorkflow={true}
          hasUnpublishedChanges={true}
          isNewEntry={false}
          isModification={true}
          useOpenAuthoring={useOpenAuthoring}
        />,
      );
      expect(asFragment()).toMatchSnapshot();
    });

    it(`should render with workflow controls hasUnpublishedChanges=true,isNewEntry=false,isModification=false,useOpenAuthoring=${useOpenAuthoring}`, () => {
      const { asFragment } = render(
        <EditorToolbar
          {...props}
          hasWorkflow={true}
          hasUnpublishedChanges={true}
          isNewEntry={false}
          isModification={false}
          useOpenAuthoring={useOpenAuthoring}
        />,
      );
      expect(asFragment()).toMatchSnapshot();
    });

    it(`should render with workflow controls hasUnpublishedChanges=false,isNewEntry=false,isModification=false,useOpenAuthoring=${useOpenAuthoring}`, () => {
      const { asFragment } = render(
        <EditorToolbar
          {...props}
          hasWorkflow={true}
          hasUnpublishedChanges={false}
          isNewEntry={false}
          isModification={false}
          useOpenAuthoring={useOpenAuthoring}
        />,
      );
      expect(asFragment()).toMatchSnapshot();
    });

    ['draft', 'pending_review', 'pending_publish'].forEach(status => {
      it(`should render with status=${status},useOpenAuthoring=${useOpenAuthoring}`, () => {
        const { asFragment } = render(
          <EditorToolbar
            {...props}
            hasWorkflow={true}
            currentStatus={status}
            useOpenAuthoring={useOpenAuthoring}
          />,
        );
        expect(asFragment()).toMatchSnapshot();
      });
    });

    it(`should render normal save button`, () => {
      const { asFragment } = render(<EditorToolbar {...props} hasChanged={true} />);
      expect(asFragment()).toMatchSnapshot();
    });
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

  describe('DCMS-1405: create_scope gates the create affordance', () => {
    const scopedProps = {
      ...props,
      isNewEntry: false,
      hasChanged: false,
      collection: fromJS({ name: 'posts', create: true, create_scope: 'content:write' }),
    };

    it('hides the create-new-entry affordance when the user has no matching scope', () => {
      render(<EditorToolbar {...scopedProps} user={{ name: 'Jane' }} />);
      expect(
        screen.queryByText('editor.editorToolbar.duplicate'),
      ).not.toBeInTheDocument();
    });

    it('shows the create-new-entry affordance once the user holds the required scope', () => {
      render(<EditorToolbar {...scopedProps} user={{ name: 'Jane', role: 'editor' }} userScopes={['content:read', 'content:write']} />);
      expect(screen.getByText('editor.editorToolbar.duplicate')).toBeInTheDocument();
    });

    it('is unaffected when the collection has no create_scope configured', () => {
      render(
        <EditorToolbar
          {...props}
          isNewEntry={false}
          hasChanged={false}
          collection={fromJS({ name: 'posts', create: true })}
          user={{ name: 'Jane' }}
        />,
      );
      expect(screen.getByText('editor.editorToolbar.duplicate')).toBeInTheDocument();
    });
  });
});

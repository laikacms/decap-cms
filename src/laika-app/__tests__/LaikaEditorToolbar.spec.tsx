import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-polyglot', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

// Replace core's SettingsDropdown with a marker so we focus on the laika
// surface and don't need to wire up a real Redux user state.
vi.mock('../../core/components/UI', () => ({
  SettingsDropdown: () => <div data-testid="settings-dropdown" />,
}));

import LaikaEditorToolbar from '../LaikaEditorToolbar';

const baseProps = {
  collection: { name: 'posts', label: 'Posts' } as any,
  isPersisting: false,
  isPublishing: false,
  isUpdatingStatus: false,
  isDeleting: false,
  onPersist: vi.fn(),
  onPersistAndNew: vi.fn(),
  onPersistAndDuplicate: vi.fn(),
  onDelete: vi.fn(),
  onDeleteUnpublishedChanges: vi.fn(),
  onChangeStatus: vi.fn(),
  showDelete: true,
  onPublish: vi.fn(),
  unPublish: vi.fn(),
  onDuplicate: vi.fn(),
  onPublishAndNew: vi.fn(),
  onPublishAndDuplicate: vi.fn(),
  user: { name: 'Alice', avatar_url: 'https://example.test/a.png' },
  hasChanged: false,
  displayUrl: 'https://example.test',
  hasWorkflow: false,
  useOpenAuthoring: false,
  hasUnpublishedChanges: false,
  isNewEntry: false,
  isModification: false,
  currentStatus: undefined,
  onLogoutClick: vi.fn(),
  loadDeployPreview: vi.fn(),
  deployPreview: undefined,
  editorBackLink: '',
};

describe('LaikaEditorToolbar', () => {
  it('renders the breadcrumb with collection label + back link', () => {
    const { getByText, getByLabelText } = render(
      <MemoryRouter>
        <LaikaEditorToolbar {...baseProps} />
      </MemoryRouter>,
    );
    expect(getByText('Posts')).toBeInTheDocument();
    const back = getByLabelText('Back');
    expect(back.getAttribute('href')).toBe('/collections/posts');
  });

  it('uses the editorBackLink override when supplied', () => {
    const { getByLabelText } = render(
      <MemoryRouter>
        <LaikaEditorToolbar {...baseProps} editorBackLink="/custom/back" />
      </MemoryRouter>,
    );
    expect(getByLabelText('Back').getAttribute('href')).toBe('/custom/back');
  });

  it('disables Save when there are no unsaved changes', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaEditorToolbar {...baseProps} hasChanged={false} />
      </MemoryRouter>,
    );
    expect(getByText('editor.editorToolbar.save').closest('button')).toBeDisabled();
  });

  it('enables Save when hasChanged is true', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaEditorToolbar {...baseProps} hasChanged />
      </MemoryRouter>,
    );
    expect(getByText('editor.editorToolbar.save').closest('button')).not.toBeDisabled();
  });

  it('fires onPersist when Save is clicked', () => {
    const onPersist = vi.fn();
    const { getByText } = render(
      <MemoryRouter>
        <LaikaEditorToolbar {...baseProps} hasChanged onPersist={onPersist} />
      </MemoryRouter>,
    );
    fireEvent.click(getByText('editor.editorToolbar.save'));
    expect(onPersist).toHaveBeenCalledTimes(1);
  });

  it('shows the workflow status badge when editorial workflow is on and entry has a status', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaEditorToolbar
          {...baseProps}
          hasWorkflow
          isNewEntry={false}
          currentStatus="pending_review"
        />
      </MemoryRouter>,
    );
    expect(getByText('editor.editorToolbar.inReview')).toBeInTheDocument();
  });

  it('renders the SettingsDropdown', () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <LaikaEditorToolbar {...baseProps} />
      </MemoryRouter>,
    );
    expect(getByTestId('settings-dropdown')).toBeInTheDocument();
  });

  it('shows Publish for a new entry in simple mode (DCMS-511)', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaEditorToolbar {...baseProps} hasWorkflow={false} isNewEntry />
      </MemoryRouter>,
    );
    expect(getByText('editor.editorToolbar.publishNow')).toBeInTheDocument();
  });

  it('hides Publish for a new entry under editorial workflow', () => {
    const { queryByText } = render(
      <MemoryRouter>
        <LaikaEditorToolbar {...baseProps} hasWorkflow isNewEntry />
      </MemoryRouter>,
    );
    expect(queryByText('editor.editorToolbar.publishNow')).not.toBeInTheDocument();
  });

  it('wires the chain-create actions into the More actions menu when collection.create is on (DCMS-511)', () => {
    const onPersistAndNew = vi.fn();
    const onPersistAndDuplicate = vi.fn();
    const onPublishAndNew = vi.fn();
    const onPublishAndDuplicate = vi.fn();
    const { getByLabelText, getByText } = render(
      <MemoryRouter>
        <LaikaEditorToolbar
          {...baseProps}
          collection={{ name: 'posts', label: 'Posts', create: true } as any}
          onPersistAndNew={onPersistAndNew}
          onPersistAndDuplicate={onPersistAndDuplicate}
          onPublishAndNew={onPublishAndNew}
          onPublishAndDuplicate={onPublishAndDuplicate}
        />
      </MemoryRouter>,
    );

    fireEvent.click(getByLabelText('More actions'));

    fireEvent.click(getByText('editor.editorToolbar.saveAndCreateNew'));
    expect(onPersistAndNew).toHaveBeenCalledTimes(1);

    fireEvent.click(getByLabelText('More actions'));
    fireEvent.click(getByText('editor.editorToolbar.saveAndDuplicate'));
    expect(onPersistAndDuplicate).toHaveBeenCalledTimes(1);

    fireEvent.click(getByLabelText('More actions'));
    fireEvent.click(getByText('editor.editorToolbar.publishAndCreateNew'));
    expect(onPublishAndNew).toHaveBeenCalledTimes(1);

    fireEvent.click(getByLabelText('More actions'));
    fireEvent.click(getByText('editor.editorToolbar.publishAndDuplicate'));
    expect(onPublishAndDuplicate).toHaveBeenCalledTimes(1);
  });

  it('does not render chain-create actions when collection.create is off', () => {
    const { queryByText } = render(
      <MemoryRouter>
        <LaikaEditorToolbar {...baseProps} />
      </MemoryRouter>,
    );
    fireEvent.click(document.querySelector('[aria-label="More actions"]')!);
    expect(queryByText('editor.editorToolbar.saveAndCreateNew')).not.toBeInTheDocument();
    expect(queryByText('editor.editorToolbar.publishAndCreateNew')).not.toBeInTheDocument();
  });
});

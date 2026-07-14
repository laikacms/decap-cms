/* eslint-disable import/order -- vi.mock calls must precede imports that depend on them */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import React from 'react';

import Editor from '@/core/components/Editor/Editor';

vi.mock('../EditorInterface', () => ({
  default: props => <mock-editor-interface {...props} />,
}));
vi.mock('../../../../ui/default/index', () => ({
  Loader: props => <mock-loader {...props} />,
}));
vi.mock('../../../../app/components/NotFoundPage', () => ({
  default: ({ message, backLink }: { message?: string; backLink?: { to: string; label: string } }) => (
    <div data-testid="not-found-page">
      {message && <p>{message}</p>}
      {backLink && <a href={backLink.to}>{backLink.label}</a>}
    </div>
  ),
}));
vi.mock('../../../routing/context', () => ({
  useLocation: vi.fn().mockReturnValue({ search: '?title=title', pathname: '/posts/slug' }),
}));
vi.mock('../../../hooks/useEditor');

import * as useEditorModule from '@/core/hooks/useEditor';

const mockSetup = vi.fn().mockReturnValue({ cleanup: vi.fn() });
const mockHandleLocalBackupCheck = vi.fn();
const mockHandleBackupOnChange = vi.fn();
const mockHandleEntryChange = vi.fn();

const defaultEditorReturn = {
  collection: { name: 'posts' },
  entry: { isFetching: false },
  entryDraft: { entry: { slug: 'slug' } },
  fields: [],
  user: {},
  hasChanged: false,
  displayUrl: '',
  hasWorkflow: false,
  useOpenAuthoring: false,
  isModification: false,
  currentStatus: undefined,
  deployPreview: {},
  localBackup: {},
  draftKey: 'key',
  editorBackLink: '/posts',
  unpublishedEntry: null,
  showDelete: true,
  setup: mockSetup,
  handleLocalBackupCheck: mockHandleLocalBackupCheck,
  handleBackupOnChange: mockHandleBackupOnChange,
  handleEntryChange: mockHandleEntryChange,
  handleChangeDraftField: vi.fn(),
  handleChangeStatus: vi.fn(),
  handlePersistEntry: vi.fn(),
  handlePublishEntry: vi.fn(),
  handleUnpublishEntry: vi.fn(),
  handleDuplicateEntry: vi.fn(),
  handleDeleteEntry: vi.fn(),
  handleDeleteUnpublishedChanges: vi.fn(),
  handleLogout: vi.fn(),
  handleLoadDeployPreview: vi.fn(),
  handleValidate: vi.fn(),
  t: vi.fn(key => key),
};

describe('Editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEditorModule.useEditor).mockReturnValue(defaultEditorReturn as any);
  });

  it('should call setup on mount when collection is available', () => {
    render(<Editor collectionName="posts" slug="slug" />);
    expect(mockSetup).toHaveBeenCalledTimes(1);
  });

  it('should not call setup when collection is not available', () => {
    vi.mocked(useEditorModule.useEditor).mockReturnValue({
      ...defaultEditorReturn,
      collection: undefined,
    } as any);
    render(<Editor collectionName="posts" slug="slug" />);
    expect(mockSetup).not.toHaveBeenCalled();
  });
});

describe('Editor - DCMS-445 failed entry load renders NotFoundPage, not a bare <h3>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEditorModule.useEditor).mockReturnValue({
      ...defaultEditorReturn,
      collection: { name: 'posts', label: 'Posts' },
      entry: { error: 'Entry not found: _posts/does-not-exist.md' },
    } as any);
  });

  it('renders NotFoundPage (not a bare div/h3) with the entry error message', () => {
    const { getByTestId, queryByText, getByText } = render(
      <Editor collectionName="posts" slug="does-not-exist" />,
    );

    expect(getByTestId('not-found-page')).toBeInTheDocument();
    expect(getByText('Entry not found: _posts/does-not-exist.md')).toBeInTheDocument();
    expect(queryByText('Entry not found: _posts/does-not-exist.md', { selector: 'h3' })).toBeNull();
  });

  it('includes an in-app link back to the collection using editorBackLink + the collection label', () => {
    const { getByText } = render(<Editor collectionName="posts" slug="does-not-exist" />);

    const link = getByText('Posts');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/posts');
  });

  it('falls back to the collectionName as the link label when the collection has no label', () => {
    vi.mocked(useEditorModule.useEditor).mockReturnValue({
      ...defaultEditorReturn,
      collection: { name: 'posts' },
      entry: { error: 'Entry not found: _posts/does-not-exist.md' },
    } as any);

    const { getByText } = render(<Editor collectionName="posts" slug="does-not-exist" />);

    expect(getByText('posts').tagName).toBe('A');
  });

  it('does not mount EditorInterface on the failed-load branch', () => {
    const { queryByText } = render(<Editor collectionName="posts" slug="does-not-exist" />);
    expect(queryByText('mock-editor-interface')).toBeNull();
  });

  it('renders a supplied renderNotFound instead of the default NotFoundPage', () => {
    const renderNotFound = vi.fn(() => <div data-testid="custom-not-found" />);
    const { getByTestId, queryByTestId } = render(
      <Editor collectionName="posts" slug="does-not-exist" renderNotFound={renderNotFound} />,
    );

    expect(getByTestId('custom-not-found')).toBeInTheDocument();
    expect(queryByTestId('not-found-page')).not.toBeInTheDocument();
    expect(renderNotFound).toHaveBeenCalledTimes(1);
  });
});

/* eslint-disable import/order -- vi.mock calls must precede imports that depend on them */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import React from 'react';

import Editor from '../Editor';

vi.mock('../EditorInterface', () => ({
  default: props => <mock-editor-interface {...props} />,
}));
vi.mock('../../../../ui-default/index', () => ({
  Loader: props => <mock-loader {...props} />,
}));
vi.mock('../../../routing/context', () => ({
  useLocation: vi.fn().mockReturnValue({ search: '?title=title', pathname: '/posts/slug' }),
}));
vi.mock('../../../hooks/useEditor');

import * as useEditorModule from '../../../hooks/useEditor';

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

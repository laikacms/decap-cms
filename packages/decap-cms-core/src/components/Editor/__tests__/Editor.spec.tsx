import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

import Editor from '../Editor';

vi.mock('../EditorInterface', () => ({
  // eslint-disable-next-line react/display-name
  default: props => <mock-editor-interface {...props} />,
}));
vi.mock('decap-cms-ui-default', () => ({
  // eslint-disable-next-line react/display-name
  Loader: props => <mock-loader {...props} />,
}));
vi.mock('react-router-dom', () => ({
  useParams: vi.fn().mockReturnValue({ name: 'posts', '*': 'slug' }),
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

  it('should render loader when entryDraft is null', () => {
    vi.mocked(useEditorModule.useEditor).mockReturnValue({
      ...defaultEditorReturn,
      entryDraft: null,
    } as any);
    const { asFragment } = render(<Editor />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render loader when entryDraft entry is undefined', () => {
    vi.mocked(useEditorModule.useEditor).mockReturnValue({
      ...defaultEditorReturn,
      entryDraft: {},
    } as any);
    const { asFragment } = render(<Editor />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render loader when entry is fetching', () => {
    vi.mocked(useEditorModule.useEditor).mockReturnValue({
      ...defaultEditorReturn,
      entry: { isFetching: true },
    } as any);
    const { asFragment } = render(<Editor />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render editor interface when entry is not fetching', () => {
    const { asFragment } = render(<Editor />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should call setup on mount when collection is available', () => {
    render(<Editor />);
    expect(mockSetup).toHaveBeenCalledTimes(1);
  });

  it('should not call setup when collection is not available', () => {
    vi.mocked(useEditorModule.useEditor).mockReturnValue({
      ...defaultEditorReturn,
      collection: undefined,
    } as any);
    render(<Editor />);
    expect(mockSetup).not.toHaveBeenCalled();
  });
});

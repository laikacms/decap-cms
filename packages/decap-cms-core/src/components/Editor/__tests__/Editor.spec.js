import React from 'react';
import { render } from '@testing-library/react';

import { Editor } from '../Editor';

jest.mock('lodash/debounce', () => {
  const flush = jest.fn();
  return func => {
    func.flush = flush;
    return func;
  };
});
// eslint-disable-next-line react/display-name
jest.mock('../EditorInterface', () => props => <mock-editor-interface {...props} />);
jest.mock('decap-cms-ui-default', () => {
  return {
    // eslint-disable-next-line react/display-name
    Loader: props => <mock-loader {...props} />,
  };
});
jest.mock('../../../routing/history');

describe('Editor', () => {
  const props = {
    boundGetAsset: jest.fn(),
    changeDraftField: jest.fn(),
    changeDraftFieldValidation: jest.fn(),
    collection: { name: 'posts' },
    createDraftDuplicateFromEntry: jest.fn(),
    createEmptyDraft: jest.fn(),
    discardDraft: jest.fn(),
    entry: {},
    entryDraft: {},
    loadEntry: jest.fn(),
    persistEntry: jest.fn(),
    deleteEntry: jest.fn(),
    showDelete: true,
    fields: [],
    slug: 'slug',
    newEntry: true,
    updateUnpublishedEntryStatus: jest.fn(),
    publishUnpublishedEntry: jest.fn(),
    deleteUnpublishedEntry: jest.fn(),
    logoutUser: jest.fn(),
    loadEntries: jest.fn(),
    deployPreview: {},
    loadDeployPreview: jest.fn(),
    user: {},
    t: jest.fn(key => key),
    localBackup: {},
    retrieveLocalBackup: jest.fn(),
    persistLocalBackup: jest.fn(),
    location: { search: '?title=title' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loader when entryDraft is null', () => {
    // suppress prop type error
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { asFragment } = render(<Editor {...props} entryDraft={null} />);
    expect(asFragment()).toMatchSnapshot();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Warning: Failed prop type: The prop `entryDraft` is marked as required in `Editor`, but its value is `null`.',
      ),
    );
  });

  it('should render loader when entryDraft entry is undefined', () => {
    const { asFragment } = render(<Editor {...props} entryDraft={{}} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render loader when entry is fetching', () => {
    const { asFragment } = render(
      <Editor {...props} entryDraft={{ entry: {} }} entry={{ isFetching: true }} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render editor interface when entry is not fetching', () => {
    const { asFragment } = render(
      <Editor {...props} entryDraft={{ entry: { slug: 'slug' } }} entry={{ isFetching: false }} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('should call retrieveLocalBackup on mount', () => {
    render(
      <Editor {...props} entryDraft={{ entry: { slug: 'slug' } }} entry={{ isFetching: false }} />,
    );

    expect(props.retrieveLocalBackup).toHaveBeenCalledTimes(1);
    expect(props.retrieveLocalBackup).toHaveBeenCalledWith(props.collection, props.slug);
  });

  it('should create new draft on new entry when mounting', () => {
    render(
      <Editor
        {...props}
        entryDraft={{ entry: { slug: 'slug' } }}
        entry={{ isFetching: false }}
        newEntry={true}
      />,
    );

    expect(props.createEmptyDraft).toHaveBeenCalledTimes(1);
    expect(props.createEmptyDraft).toHaveBeenCalledWith(props.collection, '?title=title');
    expect(props.loadEntry).toHaveBeenCalledTimes(0);
  });

  it('should load entry on existing entry when mounting', () => {
    render(
      <Editor
        {...props}
        entryDraft={{ entry: { slug: 'slug' } }}
        entry={{ isFetching: false }}
        newEntry={false}
      />,
    );

    expect(props.createEmptyDraft).toHaveBeenCalledTimes(0);
    expect(props.loadEntry).toHaveBeenCalledTimes(1);
    expect(props.loadEntry).toHaveBeenCalledWith(props.collection, 'slug');
  });

  it('should load entries when entries are not loaded when mounting', () => {
    render(
      <Editor
        {...props}
        entryDraft={{ entry: { slug: 'slug' } }}
        entry={{ isFetching: false }}
        collectionEntriesLoaded={false}
      />,
    );

    expect(props.loadEntries).toHaveBeenCalledTimes(1);
    expect(props.loadEntries).toHaveBeenCalledWith(props.collection);
  });

  it('should not load entries when entries are loaded when mounting', () => {
    render(
      <Editor
        {...props}
        entryDraft={{ entry: { slug: 'slug' } }}
        entry={{ isFetching: false }}
        collectionEntriesLoaded={true}
      />,
    );

    expect(props.loadEntries).toHaveBeenCalledTimes(0);
  });

  it('should flush debounce createBackup, discard draft and remove exit blocker on umount', () => {
    window.removeEventListener = jest.fn();
    const debounce = require('lodash/debounce');

    const flush = debounce({}).flush;
    const { unmount } = render(
      <Editor
        {...props}
        entryDraft={{ entry: { slug: 'slug' }, hasChanged: true }}
        entry={{ isFetching: false }}
      />,
    );

    jest.clearAllMocks();
    unmount();

    expect(flush).toHaveBeenCalledTimes(1);
    expect(props.discardDraft).toHaveBeenCalledTimes(1);
    expect(window.removeEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    const callback = window.removeEventListener.mock.calls.find(
      call => call[0] === 'beforeunload',
    )[1];

    const event = {};
    callback(event);
    expect(event).toEqual({ returnValue: 'editor.editor.onLeavePage' });
  });

  it('should persist backup when changed', () => {
    const { rerender } = render(
      <Editor {...props} entryDraft={{ entry: {} }} entry={{ isFetching: false }} />,
    );

    jest.clearAllMocks();
    rerender(
      <Editor
        {...props}
        entryDraft={{ entry: { mediaFiles: [{ id: '1' }] } }}
        entry={{ isFetching: false, data: {} }}
        hasChanged={true}
      />,
    );

    expect(props.persistLocalBackup).toHaveBeenCalledTimes(1);
    expect(props.persistLocalBackup).toHaveBeenCalledWith(
      { mediaFiles: [{ id: '1' }] },
      props.collection,
    );
  });
});

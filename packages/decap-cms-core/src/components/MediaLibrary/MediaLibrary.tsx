import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import orderBy from 'lodash/orderBy';
import map from 'lodash/map';
import { translate } from 'react-polyglot';
import fuzzy from 'fuzzy';
import { fileExtension } from 'decap-cms-lib-util';
import type { TranslateFunction } from 'decap-cms-ui-default';

import {
  loadMedia as loadMediaAction,
  persistMedia as persistMediaAction,
  deleteMedia as deleteMediaAction,
  insertMedia as insertMediaAction,
  loadMediaDisplayURL as loadMediaDisplayURLAction,
  closeMediaLibrary as closeMediaLibraryAction,
} from '../../actions/mediaLibrary';
import { selectMediaFiles } from '../../reducers/mediaLibrary';
import MediaLibraryModal, { fileShape } from './MediaLibraryModal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type State = any;

/**
 * Extensions used to determine which files to show when the media library is
 * accessed from an image insertion field.
 */
const IMAGE_EXTENSIONS_VIEWABLE = [
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'png',
  'bmp',
  'tiff',
  'svg',
  'avif',
];
const IMAGE_EXTENSIONS = [...IMAGE_EXTENSIONS_VIEWABLE];

interface MediaFile {
  id: string;
  name: string;
  displayURL?: string | { original: string };
  path: string;
  draft?: boolean;
  size?: number;
  url?: string;
  key?: string;
  type?: string;
  queryOrder?: number;
}

interface SortField {
  fieldName: string;
  direction: 'asc' | 'desc';
}

interface MediaLibraryState {
  selectedFile: MediaFile | Record<string, never>;
  query: string;
  isPersisted: boolean;
  sortFields?: SortField[];
}

interface MediaLibraryProps {
  isVisible?: boolean;
  loadMediaDisplayURL?: (file: MediaFile) => void;
  displayURLs?: Record<string, unknown>;
  canInsert?: boolean;
  files?: MediaFile[];
  dynamicSearch?: boolean;
  dynamicSearchActive?: boolean;
  forImage?: boolean;
  isLoading?: boolean;
  isPersisting?: boolean;
  isDeleting?: boolean;
  hasNextPage?: boolean;
  isPaginating?: boolean;
  privateUpload?: boolean;
  config?: Record<string, unknown>;
  loadMedia: (opts?: {
    delay?: number;
    query?: string;
    page?: number;
    privateUpload?: boolean;
  }) => void;
  dynamicSearchQuery?: string;
  page?: number;
  persistMedia: (file: File, opts?: { privateUpload?: boolean; field?: unknown }) => void;
  deleteMedia: (file: MediaFile | undefined, opts?: { privateUpload?: boolean }) => Promise<void>;
  insertMedia: (mediaPath: string | string[], field?: unknown) => void;
  closeMediaLibrary: () => void;
  field?: unknown;
  t: TranslateFunction;
}

class MediaLibrary extends React.Component<MediaLibraryProps, MediaLibraryState> {
  static propTypes = {
    isVisible: PropTypes.bool,
    loadMediaDisplayURL: PropTypes.func,
    displayURLs: PropTypes.object,
    canInsert: PropTypes.bool,
    files: PropTypes.arrayOf(PropTypes.shape(fileShape)).isRequired,
    dynamicSearch: PropTypes.bool,
    dynamicSearchActive: PropTypes.bool,
    forImage: PropTypes.bool,
    isLoading: PropTypes.bool,
    isPersisting: PropTypes.bool,
    isDeleting: PropTypes.bool,
    hasNextPage: PropTypes.bool,
    isPaginating: PropTypes.bool,
    privateUpload: PropTypes.bool,
    config: PropTypes.object,
    loadMedia: PropTypes.func.isRequired,
    dynamicSearchQuery: PropTypes.string,
    page: PropTypes.number,
    persistMedia: PropTypes.func.isRequired,
    deleteMedia: PropTypes.func.isRequired,
    insertMedia: PropTypes.func.isRequired,
    closeMediaLibrary: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
  };

  static defaultProps = {
    files: [],
  };

  scrollContainerRef: HTMLDivElement | null = null;

  /**
   * The currently selected file and query are tracked in component state as
   * they do not impact the rest of the application.
   */
  state: MediaLibraryState = {
    selectedFile: {},
    query: '',
    isPersisted: false,
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(MediaLibrary.propTypes, this.props, 'prop', 'MediaLibrary');

    this.props.loadMedia();
  }

  UNSAFE_componentWillReceiveProps(nextProps: MediaLibraryProps) {
    /**
     * We clear old state from the media library when it's being re-opened
     * because, when doing so on close, the state is cleared while the media
     * library is still fading away.
     */
    const isOpening = !this.props.isVisible && nextProps.isVisible;
    if (isOpening) {
      this.setState({ selectedFile: {}, query: '' });
    }

    if (this.state.isPersisted) {
      this.setState({
        selectedFile: nextProps.files?.[0] ?? {},
        isPersisted: false,
      });
    }
  }

  componentDidUpdate(prevProps: MediaLibraryProps) {
    const isOpening = !prevProps.isVisible && this.props.isVisible;

    if (isOpening && prevProps.privateUpload !== this.props.privateUpload) {
      this.props.loadMedia({ privateUpload: this.props.privateUpload });
    }

    if (this.state.isPersisted) {
      this.setState({
        selectedFile: this.props.files?.[0] ?? {},
        isPersisted: false,
      });
    }
  }

  loadDisplayURL = (file: MediaFile) => {
    const { loadMediaDisplayURL } = this.props;
    loadMediaDisplayURL?.(file);
  };

  /**
   * Filter an array of file data to include only images.
   */
  filterImages = (files: MediaFile[]) => {
    return files.filter(file => {
      const ext = fileExtension(file.name).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext);
    });
  };

  /**
   * Transform file data for table display.
   */
  toTableData = (files: MediaFile[]) => {
    const tableData =
      files &&
      files.map(({ key, name, id, size, path, queryOrder, displayURL, draft }: MediaFile) => {
        const ext = fileExtension(name).toLowerCase();
        return {
          key: key || '',
          id,
          name,
          path,
          type: ext.toUpperCase(),
          size,
          queryOrder,
          displayURL,
          draft,
          isImage: IMAGE_EXTENSIONS.includes(ext),
          isViewableImage: IMAGE_EXTENSIONS_VIEWABLE.includes(ext),
        };
      });

    /**
     * Get the sort order for use with `lodash.orderBy`, and always add the
     * `queryOrder` sort as the lowest priority sort order.
     */
    const { sortFields } = this.state;
    const fieldNames = map(sortFields, 'fieldName').concat('queryOrder');
    const directions = map(sortFields, 'direction').concat('asc') as ('asc' | 'desc')[];
    return orderBy(tableData, fieldNames, directions);
  };

  handleClose = () => {
    this.props.closeMediaLibrary();
  };

  /**
   * Toggle asset selection on click.
   */
  handleAssetClick = (asset: MediaFile) => {
    const selectedFile =
      'key' in this.state.selectedFile && this.state.selectedFile.key === asset.key ? {} : asset;
    this.setState({ selectedFile });
  };

  /**
   * Upload a file.
   */
  handlePersist = async (
    event: React.ChangeEvent<HTMLInputElement> & { dataTransfer?: DataTransfer },
  ) => {
    /**
     * Stop the browser from automatically handling the file input click, and
     * get the file for upload, and retain the synthetic event for access after
     * the asynchronous persist operation.
     */
    event.persist();
    event.stopPropagation();
    event.preventDefault();
    const { persistMedia, privateUpload, config, t, field } = this.props;
    const { files: fileList } = event.dataTransfer || event.target;
    const files = [...(fileList as FileList)];
    const file = files[0];
    const maxFileSize = (config as Record<string, unknown> | undefined)?.max_file_size as
      | number
      | undefined;

    if (maxFileSize && file.size > maxFileSize) {
      window.alert(
        t('mediaLibrary.mediaLibrary.fileTooLarge', {
          size: Math.floor(maxFileSize / 1000),
        }),
      );
    } else {
      await persistMedia(file, { privateUpload, field });

      this.setState({ isPersisted: true });

      this.scrollToTop();
    }

    event.target.value = '';
  };

  /**
   * Stores the public path of the file in the application store, where the
   * editor field that launched the media library can retrieve it.
   */
  handleInsert = () => {
    const { selectedFile } = this.state;
    const path = 'path' in selectedFile ? (selectedFile as MediaFile).path : undefined;
    const { insertMedia, field } = this.props;
    if (path) {
      insertMedia(path, field);
    }
    this.handleClose();
  };

  /**
   * Removes the selected file from the backend.
   */
  handleDelete = () => {
    const { selectedFile } = this.state;
    const { files, deleteMedia, privateUpload, t } = this.props;
    if (!window.confirm(t('mediaLibrary.mediaLibrary.onDelete'))) {
      return;
    }
    const selectedKey = 'key' in selectedFile ? selectedFile.key : undefined;
    const file = files?.find(file => selectedKey === file.key);
    deleteMedia(file, { privateUpload }).then(() => {
      this.setState({ selectedFile: {} });
    });
  };

  /**
   * Downloads the selected file.
   */
  handleDownload = () => {
    const { selectedFile } = this.state;
    const { displayURLs } = this.props;
    const selectedId = 'id' in selectedFile ? (selectedFile as MediaFile).id : undefined;
    const selectedUrl = 'url' in selectedFile ? (selectedFile as MediaFile).url : undefined;
    const url =
      ((displayURLs as Record<string, Record<string, unknown>> | undefined)?.[selectedId ?? '']
        ?.url as string | undefined) || selectedUrl;
    if (!url) {
      return;
    }

    const filename = 'name' in selectedFile ? (selectedFile as MediaFile).name : '';

    const element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
    this.setState({ selectedFile: {} });
  };

  /**
   *
   */

  handleLoadMore = () => {
    const { loadMedia, dynamicSearchQuery, page, privateUpload } = this.props;
    loadMedia({ query: dynamicSearchQuery, page: (page ?? 0) + 1, privateUpload });
  };

  /**
   * Executes media library search for implementations that support dynamic
   * search via request. For these implementations, the Enter key must be
   * pressed to execute search. If assets are being stored directly through
   * the GitHub backend, search is in-memory and occurs as the query is typed,
   * so this handler has no impact.
   */
  handleSearchKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { dynamicSearch, loadMedia, privateUpload } = this.props;
    if (event.key === 'Enter' && dynamicSearch) {
      await loadMedia({ query: this.state.query, privateUpload });
      this.scrollToTop();
    }
  };

  scrollToTop = () => {
    if (this.scrollContainerRef) {
      this.scrollContainerRef.scrollTop = 0;
    }
  };

  /**
   * Updates query state as the user types in the search field.
   */
  handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ query: event.target.value });
  };

  /**
   * Filters files that do not match the query. Not used for dynamic search.
   */
  queryFilter = (query: string, files: MediaFile[]) => {
    /**
     * Because file names don't have spaces, typing a space eliminates all
     * potential matches, so we strip them all out internally before running the
     * query.
     */
    const strippedQuery = query.replace(/ /g, '');
    const matches = fuzzy.filter(strippedQuery, files, { extract: (file: MediaFile) => file.name });
    const matchFiles = matches.map((match, queryIndex) => {
      const file = files[match.index];
      return { ...file, queryIndex };
    });
    return matchFiles;
  };

  render() {
    const {
      isVisible,
      canInsert,
      files,
      dynamicSearch,
      dynamicSearchActive,
      forImage,
      isLoading,
      isPersisting,
      isDeleting,
      hasNextPage,
      isPaginating,
      privateUpload,
      displayURLs,
      t,
    } = this.props;

    return (
      <MediaLibraryModal
        isVisible={isVisible}
        canInsert={canInsert}
        files={files!}
        dynamicSearch={dynamicSearch}
        dynamicSearchActive={dynamicSearchActive}
        forImage={forImage}
        isLoading={isLoading}
        isPersisting={isPersisting}
        isDeleting={isDeleting}
        hasNextPage={hasNextPage}
        isPaginating={isPaginating}
        privateUpload={privateUpload}
        query={this.state.query}
        selectedFile={this.state.selectedFile}
        handleFilter={this.filterImages}
        handleQuery={this.queryFilter}
        toTableData={this.toTableData}
        handleClose={this.handleClose}
        handleSearchChange={this.handleSearchChange}
        handleSearchKeyDown={this.handleSearchKeyDown}
        handlePersist={this.handlePersist as (event: React.ChangeEvent<HTMLInputElement>) => void}
        handleDelete={this.handleDelete}
        handleInsert={this.handleInsert}
        handleDownload={this.handleDownload}
        setScrollContainerRef={(ref: HTMLDivElement | null) => (this.scrollContainerRef = ref)}
        handleAssetClick={this.handleAssetClick}
        handleLoadMore={this.handleLoadMore}
        displayURLs={displayURLs as any}
        loadDisplayURL={this.loadDisplayURL}
      />
    );
  }
}

function mapStateToProps(state: State) {
  const { mediaLibrary } = state;
  const field = mediaLibrary.field;
  const mediaLibraryProps = {
    isVisible: mediaLibrary.isVisible,
    canInsert: mediaLibrary.canInsert,
    files: selectMediaFiles(state, field),
    displayURLs: mediaLibrary.displayURLs,
    dynamicSearch: mediaLibrary.dynamicSearch,
    dynamicSearchActive: mediaLibrary.dynamicSearchActive,
    dynamicSearchQuery: mediaLibrary.dynamicSearchQuery,
    forImage: mediaLibrary.forImage,
    isLoading: mediaLibrary.isLoading,
    isPersisting: mediaLibrary.isPersisting,
    isDeleting: mediaLibrary.isDeleting,
    privateUpload: mediaLibrary.privateUpload,
    config: mediaLibrary.config,
    page: mediaLibrary.page,
    hasNextPage: mediaLibrary.hasNextPage,
    isPaginating: mediaLibrary.isPaginating,
    field,
  };
  return { ...mediaLibraryProps };
}

const mapDispatchToProps = {
  loadMedia: loadMediaAction,
  persistMedia: persistMediaAction,
  deleteMedia: deleteMediaAction,
  insertMedia: insertMediaAction,
  loadMediaDisplayURL: loadMediaDisplayURLAction,
  closeMediaLibrary: closeMediaLibraryAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(translate()(MediaLibrary) as any);

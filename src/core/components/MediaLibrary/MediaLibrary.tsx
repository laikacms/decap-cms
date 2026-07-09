import React from 'react';
import orderBy from 'lodash/orderBy';
import map from 'lodash/map';
import { useTranslate } from 'react-polyglot';
import fuzzy from 'fuzzy';

import { fileExtension } from '../../../lib-util/index';
import {
  loadMedia as loadMediaAction,
  persistMedia as persistMediaAction,
  deleteMedia as deleteMediaAction,
  insertMedia as insertMediaAction,
  loadMediaDisplayURL as loadMediaDisplayURLAction,
  closeMediaLibrary as closeMediaLibraryAction,
} from '../../actions/mediaLibrary';
import { selectMediaFiles } from '../../reducers/mediaLibrary';
import MediaLibraryModal from './MediaLibraryModal';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { defaultRouter } from '../../routing/router';

import type { TranslateFunction } from '../../../ui-default/index';

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

function filterImages(files: MediaFile[]) {
  return files.filter(file => {
    const ext = fileExtension(file.name).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
  });
}

export function MediaLibrary({ files = [], ...rest }: MediaLibraryProps) {
  const props = { ...rest, files };
  const {
    isVisible,
    canInsert,
    dynamicSearch,
    dynamicSearchActive,
    dynamicSearchQuery,
    forImage,
    isLoading,
    isPersisting,
    isDeleting,
    hasNextPage,
    isPaginating,
    privateUpload,
    displayURLs,
    page,
    config,
    field,
    loadMedia,
    persistMedia,
    deleteMedia,
    insertMedia,
    loadMediaDisplayURL,
    closeMediaLibrary,
    t,
  } = props;

  const [selectedFile, setSelectedFile] = React.useState<MediaFile | Record<string, never>>({});
  const [query, setQuery] = React.useState('');
  const [isPersisted, setIsPersisted] = React.useState(false);
  const [sortFields] = React.useState<SortField[] | undefined>(undefined);

  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const wasVisibleRef = React.useRef(isVisible);
  const prevPrivateUploadRef = React.useRef(privateUpload);

  React.useEffect(() => {
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  /**
   * The modal is rendered via a `ReactModalPortal` that sits above the router's
   * own views, so navigating away (browser Back, hash change, or a programmatic
   * `defaultRouter.navigate`) doesn't unmount it — `isVisible` just stays `true`
   * and the portal keeps intercepting pointer events on the destination page.
   * Mirrors the router-subscribe teardown pattern in `useEditor.ts`.
   */
  React.useEffect(() => {
    return defaultRouter.subscribe(() => {
      if (isVisible) {
        closeMediaLibrary();
      }
    });
  }, [isVisible, closeMediaLibrary]);

  /**
   * Replicates the prior UNSAFE_componentWillReceiveProps + componentDidUpdate
   * behavior: clear local state when the modal opens, and replace the selected
   * file with files[0] right after a persist completes.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs every render to compare prev refs
  React.useEffect(() => {
    const wasVisible = wasVisibleRef.current;
    const isOpening = !wasVisible && isVisible;

    if (isOpening) {
      setSelectedFile({});
      setQuery('');
      if (prevPrivateUploadRef.current !== privateUpload) {
        loadMedia({ privateUpload });
      }
    }

    if (isPersisted) {
      setSelectedFile(files[0] ?? {});
      setIsPersisted(false);
    }

    wasVisibleRef.current = isVisible;
    prevPrivateUploadRef.current = privateUpload;
  });

  function loadDisplayURL(file: MediaFile) {
    loadMediaDisplayURL?.(file);
  }

  function toTableData(filesList: MediaFile[]) {
    const tableData =
      filesList &&
      filesList.map(({ key, name, id, size, path, queryOrder, displayURL, draft }: MediaFile) => {
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
    const fieldNames = map(sortFields, 'fieldName').concat('queryOrder');
    const directions = map(sortFields, 'direction').concat('asc') as ('asc' | 'desc')[];
    return orderBy(tableData, fieldNames, directions);
  }

  function handleClose() {
    closeMediaLibrary();
  }

  function handleAssetClick(asset: MediaFile) {
    setSelectedFile(prev => ('key' in prev && (prev as MediaFile).key === asset.key ? {} : asset));
  }

  async function handlePersist(
    event: React.ChangeEvent<HTMLInputElement> & { dataTransfer?: DataTransfer },
  ) {
    event.persist();
    event.stopPropagation();
    event.preventDefault();
    const { files: fileList } = event.dataTransfer || event.target;
    const allFiles = [...(fileList as FileList)];
    const file = allFiles[0];
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
      setIsPersisted(true);
      scrollToTop();
    }

    event.target.value = '';
  }

  function handleInsert() {
    const path = 'path' in selectedFile ? (selectedFile as MediaFile).path : undefined;
    if (path) {
      insertMedia(path, field);
    }
    handleClose();
  }

  function handleDelete() {
    if (!window.confirm(t('mediaLibrary.mediaLibrary.onDelete'))) {
      return;
    }
    const selectedKey = 'key' in selectedFile ? selectedFile.key : undefined;
    const file = files.find(f => selectedKey === f.key);
    deleteMedia(file, { privateUpload }).then(() => {
      setSelectedFile({});
    });
  }

  function handleDownload() {
    const selectedId = 'id' in selectedFile ? (selectedFile as MediaFile).id : undefined;
    const selectedUrl = 'url' in selectedFile ? (selectedFile as MediaFile).url : undefined;
    const url =
      ((displayURLs as Record<string, Record<string, unknown>> | undefined)?.[selectedId ?? '']
        ?.url as string | undefined) || selectedUrl;
    if (!url) return;

    const filename = 'name' in selectedFile ? (selectedFile as MediaFile).name : '';
    const element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setSelectedFile({});
  }

  function handleLoadMore() {
    loadMedia({ query: dynamicSearchQuery, page: (page ?? 0) + 1, privateUpload });
  }

  async function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && dynamicSearch) {
      await loadMedia({ query, privateUpload });
      scrollToTop();
    }
  }

  function scrollToTop() {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  function queryFilter(q: string, filesList: MediaFile[]) {
    const strippedQuery = q.replace(/ /g, '');
    const matches = fuzzy.filter(strippedQuery, filesList, {
      extract: (file: MediaFile) => file.name,
    });
    return matches.map((match, queryIndex) => {
      const file = filesList[match.index];
      return { ...file, queryIndex };
    });
  }

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
      query={query}
      selectedFile={selectedFile}
      handleFilter={filterImages}
      handleQuery={queryFilter}
      toTableData={toTableData}
      handleClose={handleClose}
      handleSearchChange={handleSearchChange}
      handleSearchKeyDown={handleSearchKeyDown}
      handlePersist={handlePersist as (event: React.ChangeEvent<HTMLInputElement>) => void}
      handleDelete={handleDelete}
      handleInsert={handleInsert}
      handleDownload={handleDownload}
      setScrollContainerRef={(ref: HTMLDivElement | null) => {
        scrollContainerRef.current = ref;
      }}
      handleAssetClick={handleAssetClick}
      handleLoadMore={handleLoadMore}
      displayURLs={displayURLs as any}
      loadDisplayURL={loadDisplayURL}
    />
  );
}

export default function ConnectedMediaLibrary() {
  const t = useTranslate();
  const dispatch = useAppDispatch();
  const mediaLibrary = useAppSelector((state: any) => state.mediaLibrary);
  const files = useAppSelector((state: any) => selectMediaFiles(state, state.mediaLibrary.field));

  const props: any = {
    isVisible: mediaLibrary.isVisible,
    canInsert: mediaLibrary.canInsert,
    files,
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
    field: mediaLibrary.field,
    loadMedia: (opts?: any) => dispatch(loadMediaAction(opts)),
    persistMedia: (file: File, opts?: any) => dispatch(persistMediaAction(file, opts)),
    deleteMedia: (file: any, opts?: any) => dispatch(deleteMediaAction(file, opts)),
    insertMedia: (mediaPath: string | string[], field?: any) =>
      dispatch(insertMediaAction(mediaPath, field)),
    loadMediaDisplayURL: (file: any) => dispatch(loadMediaDisplayURLAction(file)),
    closeMediaLibrary: () => dispatch(closeMediaLibraryAction()),
    t: t as TranslateFunction,
  };
  return <MediaLibrary {...props} />;
}

import { map, orderBy } from 'lodash-es';
import React from 'react';

import {
  closeMediaLibrary as closeMediaLibraryAction,
  deleteMedia as deleteMediaAction,
  insertMedia as insertMediaAction,
  loadMedia as loadMediaAction,
  loadMediaDisplayURL as loadMediaDisplayURLAction,
  persistMedia as persistMediaAction,
} from '@/core/actions/mediaLibrary';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { useTranslate } from '@/core/i18n';
import { selectAssetCollectionForFolder } from '@/core/lib/assetCollections';
import { getMediaFolderBreadcrumbs, selectMediaFiles } from '@/core/reducers/mediaLibrary';
import { useRouter } from '@/core/routing/context';
import {
  fileExtension,
  fuzzyFilter,
  isCroppableImage,
  isImageCropEnabled,
  isRecognizedImageFile,
} from '@/lib/util/index';
import { confirmDialog, showAlert } from '@/ui';
import ImageCropDialog from './ImageCropDialog';
import MediaLibraryModal from './MediaLibraryModal';

import type { CmsAssetCollection, CmsConfig, CmsImageCropConfig } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

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

/**
 * DCMS-2174: applied when `media_library.config.max_file_size` is unset, so
 * uploads through the built-in media library have a sane ceiling by default
 * instead of silently accepting arbitrarily large files. An explicit
 * `max_file_size` (including `0`, which means "no limit") in config always
 * wins over this default.
 */
export const DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB, in bytes

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
  /**
   * Effective (field-over-site-default) `media_library.config.crop` for this
   * upload session; resolved by `ConnectedMediaLibrary`, mirroring how
   * `optimizeImageFile`'s config is resolved in `actions/mediaLibrary.tsx`.
   */
  cropConfig?: CmsImageCropConfig;
  loadMedia: (opts?: {
    delay?: number,
    query?: string | undefined,
    page?: number,
    privateUpload?: boolean | undefined,
    folder?: string,
  }) => void;
  dynamicSearchQuery?: string;
  page?: number;
  persistMedia: (file: File, opts?: { privateUpload?: boolean | undefined, field?: unknown }) => void;
  deleteMedia: (file: MediaFile | undefined, opts?: { privateUpload?: boolean | undefined }) => Promise<void>;
  insertMedia: (mediaPath: string | string[], field?: unknown) => void;
  closeMediaLibrary: () => void;
  field?: unknown;
  /**
   * The effective media folder this session of the library is scoped to —
   * the field/collection's configured media_folder when opened from an
   * entry field, otherwise the site-wide `config.media_folder`. Used as the
   * top of the breadcrumb trail and re-requested on open.
   */
  rootFolder?: string;
  /** Site-wide config-defined asset collections (DCMS-1412); see `siteConfig.asset_collections`. */
  assetCollections?: CmsAssetCollection[];
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
    cropConfig,
    field,
    rootFolder,
    assetCollections = [],
    loadMedia,
    persistMedia,
    deleteMedia,
    insertMedia,
    loadMediaDisplayURL,
    closeMediaLibrary,
    t,
  } = props;

  const [selectedFile, setSelectedFile] = React.useState<MediaFile | Record<string, never>>({});
  const [pendingCropFile, setPendingCropFile] = React.useState<File | null>(null);
  const [query, setQuery] = React.useState('');
  const [isPersisted, setIsPersisted] = React.useState(false);
  const [sortFields] = React.useState<SortField[] | undefined>(undefined);
  const [currentFolder, setCurrentFolder] = React.useState<string | undefined>(rootFolder);

  const router = useRouter();
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const wasVisibleRef = React.useRef(isVisible);
  const prevPrivateUploadRef = React.useRef(privateUpload);

  React.useEffect(() => {
    // Deliberately no `folder` here: the initial/default listing must keep
    // going through loadMedia's normal pagination/integration/legacy paths
    // (only explicit folder navigation below bypasses those). Those paths
    // now pass folderSupport through to the backend as well, so the root
    // listing surfaces directory entries (isDirectory) instead of a
    // flattened recursive listing, same as explicit folder navigation.
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  function handleNavigateFolder(path: string) {
    setCurrentFolder(path);
    setSelectedFile({});
    loadMedia({ folder: path, privateUpload });
    scrollToTop();
  }

  function handleSelectAssetCollection(assetCollection: CmsAssetCollection) {
    handleNavigateFolder(assetCollection.media_folder);
  }

  const activeAssetCollection = selectAssetCollectionForFolder(
    { asset_collections: assetCollections } as CmsConfig,
    currentFolder,
  );

  /**
   * When the backend performs the search (dynamicSearch), follow typing with
   * a debounced server query so the search box behaves like the client-side
   * filter does for fully-loaded libraries. Enter still submits immediately
   * via handleSearchKeyDown.
   */
  React.useEffect(() => {
    if (!dynamicSearch) return;
    if (query === (dynamicSearchQuery ?? '')) return;
    const timeout = setTimeout(() => {
      loadMedia({ query, privateUpload });
      scrollToTop();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the typed query changes
  }, [query]);

  /**
   * The modal is rendered via a `ReactModalPortal` that sits above the router's
   * own views, so navigating away (browser Back, hash change, or a programmatic
   * router push) doesn't unmount it — `isVisible` just stays `true` and the
   * portal keeps intercepting pointer events on the destination page.
   * Mirrors the router-subscribe teardown pattern in `useEditor.ts`.
   */
  React.useEffect(() => {
    return router.subscribe(() => {
      if (isVisible) {
        closeMediaLibrary();
      }
    });
  }, [isVisible, closeMediaLibrary, router]);

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
      setCurrentFolder(rootFolder);
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
    const tableData = filesList
      && filesList.map(({ key, name, id, size, path, queryOrder, displayURL, draft }: MediaFile) => {
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
    const configuredMaxFileSize = (config as Record<string, unknown> | undefined)?.max_file_size as
      | number
      | undefined;
    // DCMS-2174: fall back to DEFAULT_MAX_FILE_SIZE only when max_file_size is
    // unset; an explicit 0 still means "no limit" (see DEFAULT_MAX_FILE_SIZE).
    const maxFileSize =
      configuredMaxFileSize === undefined ? DEFAULT_MAX_FILE_SIZE : configuredMaxFileSize;

    if (maxFileSize && file.size > maxFileSize) {
      showAlert(
        t('mediaLibrary.mediaLibrary.fileTooLarge', {
          size: Math.floor(maxFileSize / 1000),
        }),
        { title: t('mediaLibrary.mediaLibrary.fileTooLargeTitle') },
      );
    } else if (forImage && !(await isRecognizedImageFile(file))) {
      // DCMS-2173: the image-scoped picker only ever binds into image
      // fields, so content that isn't actually a raster image or SVG (e.g.
      // a text file renamed with a .png extension) must be rejected before
      // it reaches persistMedia and leaks a blob URL into the grid. The
      // standalone /media route (forImage === false) stays lenient.
      showAlert(t('mediaLibrary.mediaLibrary.invalidImageFile', { name: file.name }), {
        title: t('mediaLibrary.mediaLibrary.invalidImageFileTitle'),
      });
    } else if (forImage && isCroppableImage(file) && isImageCropEnabled(cropConfig)) {
      // DCMS-2011: hand off to the interactive crop dialog instead of
      // persisting immediately; handleCropConfirm/handleCropCancel below
      // resume (or abandon) the upload once the user has chosen a region.
      setPendingCropFile(file);
    } else {
      await persistMedia(file, { privateUpload, field });
      setIsPersisted(true);
      scrollToTop();
    }

    event.target.value = '';
  }

  async function handleCropConfirm(croppedFile: File) {
    await persistMedia(croppedFile, { privateUpload, field });
    setIsPersisted(true);
    scrollToTop();
    setPendingCropFile(null);
  }

  function handleCropCancel() {
    setPendingCropFile(null);
  }

  function handleInsert() {
    const path = 'path' in selectedFile ? (selectedFile as MediaFile).path : undefined;
    if (path) {
      insertMedia(path, field);
    }
    handleClose();
  }

  async function handleDelete() {
    if (
      !(await confirmDialog(t('mediaLibrary.mediaLibrary.onDelete'), {
        title: t('mediaLibrary.mediaLibrary.onDeleteTitle'),
      }))
    ) {
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
    const url = ((displayURLs as Record<string, Record<string, unknown>> | undefined)?.[selectedId ?? '']
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
    const matches = fuzzyFilter(strippedQuery, filesList, (file: MediaFile) => file.name);
    return matches.map((match, queryIndex) => {
      const file = filesList[match.index];
      return { ...file, queryIndex };
    });
  }

  return (
    <>
      {pendingCropFile
        ? (
          <ImageCropDialog
            file={pendingCropFile}
            aspectRatio={cropConfig?.aspect_ratio}
            onConfirm={file => void handleCropConfirm(file)}
            onCancel={handleCropCancel}
            t={t}
          />
        )
        : null}
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
        breadcrumbs={getMediaFolderBreadcrumbs(
          rootFolder,
          currentFolder,
          t('mediaLibrary.mediaLibraryBreadcrumbs.rootLabel'),
        )}
        onNavigateFolder={handleNavigateFolder}
        assetCollections={assetCollections}
        activeAssetCollectionName={activeAssetCollection?.name}
        onSelectAssetCollection={handleSelectAssetCollection}
      />
    </>
  );
}

export default function ConnectedMediaLibrary() {
  const t = useTranslate();
  const dispatch = useAppDispatch();
  const mediaLibrary = useAppSelector((state: any) => state.mediaLibrary);
  const files = useAppSelector((state: any) => selectMediaFiles(state, state.mediaLibrary.field));
  // Breadcrumb root: matches exactly what the initial (folder-less)
  // `loadMedia()` call already lists (backends default `getMedia()` to
  // `config.media_folder`), so the trail never disagrees with what's shown.
  // Per-field/per-collection media folder roots are a further scoping this
  // pass doesn't attempt — see the DCMS-1398 PR notes.
  const rootFolder = useAppSelector((state: any) =>
    typeof state.config?.media_folder === 'string' ? state.config.media_folder : undefined
  );
  const assetCollections = useAppSelector((state: any) =>
    Array.isArray(state.config?.asset_collections) ? state.config.asset_collections : []
  );
  // Field-level `media_library.config.crop` wins over the site-wide default,
  // mirroring `selectImageOptimizationConfig` in `actions/mediaLibrary.tsx`.
  const siteCropConfig = useAppSelector((state: any) => state.config?.media_library?.config?.crop);
  const cropConfig = mediaLibrary.config?.crop ?? siteCropConfig;

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
    cropConfig,
    page: mediaLibrary.page,
    hasNextPage: mediaLibrary.hasNextPage,
    isPaginating: mediaLibrary.isPaginating,
    field: mediaLibrary.field,
    rootFolder,
    assetCollections,
    loadMedia: (opts?: any) => dispatch(loadMediaAction(opts)),
    persistMedia: (file: File, opts?: any) => dispatch(persistMediaAction(file, opts)),
    deleteMedia: (file: any, opts?: any) => dispatch(deleteMediaAction(file, opts)),
    insertMedia: (mediaPath: string | string[], field?: any) => dispatch(insertMediaAction(mediaPath, field)),
    loadMediaDisplayURL: (file: any) => dispatch(loadMediaDisplayURLAction(file)),
    closeMediaLibrary: () => dispatch(closeMediaLibraryAction()),
    t: t as TranslateFunction,
  };
  return <MediaLibrary {...props} />;
}

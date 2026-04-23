import { APIError, AccessTokenError } from './errors';
import Cursor, { CURSOR_COMPATIBILITY_SYMBOL } from './Cursor';
import EditorialWorkflowError, { EDITORIAL_WORKFLOW_ERROR } from './EditorialWorkflowError';
import localForage from './localForage';
import type { LocalForage as LocalForageType } from './localForage';
import { isAbsolutePath, basename, fileExtensionWithSeparator, fileExtension, extname, dirname, join } from './path';
import { onlySuccessfulPromises, flowAsync, thenP as promiseThen } from './promise';
import unsentRequest from './unsentRequest';
import {
  filterByExtension,
  getAllResponses,
  parseLinkHeader,
  parseResponse,
  responseParser,
  getPathDepth,
} from './backendUtil';
import loadScript from './loadScript';
import getBlobSHA from './getBlobSHA';
import { asyncLock } from './asyncLock';
import {
  entriesByFiles,
  entriesByFolder,
  unpublishedEntries,
  getMediaDisplayURL,
  getMediaAsBlob,
  runWithLock,
  blobToFileObj,
  allEntriesByFolder,
} from './implementation';
import {
  readFile,
  readFileMetadata,
  isPreviewContext,
  getPreviewStatus,
  PreviewState,
  requestWithBackoff,
  getDefaultBranchName,
  throwOnConflictingBranches,
} from './API';
import {
  CMS_BRANCH_PREFIX,
  generateContentKey,
  isCMSLabel,
  labelToStatus,
  statusToLabel,
  DEFAULT_PR_BODY,
  MERGE_COMMIT_MESSAGE,
  parseContentKey,
  branchFromContentKey,
  contentKeyFromBranch,
} from './APIUtils';
import {
  createPointerFile,
  getLargeMediaFilteredMediaFiles,
  getLargeMediaPatternsFromGitAttributesFile,
  parsePointerFile,
  getPointerFileForMediaFileObj,
} from './git-lfs';

import type { PointerFile as PF } from './git-lfs';
import type { FetchError as FE, ApiRequest as AR } from './API';
import type {
  CmsImplementationEntry as IE,
  CmsUnpublishedEntryDiff as UED,
  CmsUnpublishedEntry as UE,
  CmsImplementationMediaFile as IMF,
  CmsImplementationFile as IF,
  CmsDisplayURLObject as DUO,
  CmsDisplayURL as DU,
  CmsCredentials as Cred,
  CmsUser as U,
  CmsEntryMap as E,
  CmsPersistOptions as PO,
  CmsAssetProxy as AP,
  CmsUnpublishedEntryMediaFile as UEMF,
  CmsDataFile as DF,
} from './types/cms';
import type { AsyncLock as AL } from './asyncLock';
import isHotkey, { isCodeHotkey, isKeyHotkey } from './is-hotkey';

export type AsyncLock = AL;
export type ImplementationEntry = IE;
export type UnpublishedEntryDiff = UED;
export type UnpublishedEntry = UE;
export type ImplementationMediaFile = IMF;
export type ImplementationFile = IF;
export type DisplayURL = DU;
export type DisplayURLObject = DUO;
export type Credentials = Cred;
export type User = U;
export type Entry = E;
export type UnpublishedEntryMediaFile = UEMF;
export type PersistOptions = PO;
export type AssetProxy = AP;
export type ApiRequest = AR;
export type FetchError = FE;
export type PointerFile = PF;
export type DataFile = DF;
export type LocalForage = LocalForageType;

export const DecapCmsLibUtil = {
  APIError,
  Cursor,
  CURSOR_COMPATIBILITY_SYMBOL,
  EditorialWorkflowError,
  EDITORIAL_WORKFLOW_ERROR,
  localForage,
  basename,
  dirname,
  extname,
  join,
  fileExtensionWithSeparator,
  fileExtension,
  onlySuccessfulPromises,
  flowAsync,
  promiseThen,
  unsentRequest,
  filterByExtension,
  parseLinkHeader,
  parseResponse,
  responseParser,
  loadScript,
  getBlobSHA,
  getPathDepth,
  entriesByFiles,
  entriesByFolder,
  unpublishedEntries,
  getMediaDisplayURL,
  getMediaAsBlob,
  readFile,
  readFileMetadata,
  CMS_BRANCH_PREFIX,
  generateContentKey,
  isCMSLabel,
  labelToStatus,
  statusToLabel,
  DEFAULT_PR_BODY,
  MERGE_COMMIT_MESSAGE,
  isPreviewContext,
  getPreviewStatus,
  runWithLock,
  PreviewState,
  parseContentKey,
  createPointerFile,
  getLargeMediaFilteredMediaFiles,
  getLargeMediaPatternsFromGitAttributesFile,
  parsePointerFile,
  getPointerFileForMediaFileObj,
  branchFromContentKey,
  contentKeyFromBranch,
  blobToFileObj,
  requestWithBackoff,
  getDefaultBranchName,
  allEntriesByFolder,
  AccessTokenError,
  throwOnConflictingBranches,
};
export {
  APIError,
  Cursor,
  CURSOR_COMPATIBILITY_SYMBOL,
  EditorialWorkflowError,
  EDITORIAL_WORKFLOW_ERROR,
  localForage,
  basename,
  dirname,
  extname,
  join,
  fileExtensionWithSeparator,
  fileExtension,
  onlySuccessfulPromises,
  flowAsync,
  promiseThen,
  unsentRequest,
  filterByExtension,
  parseLinkHeader,
  getAllResponses,
  parseResponse,
  responseParser,
  loadScript,
  getBlobSHA,
  asyncLock,
  isAbsolutePath,
  getPathDepth,
  entriesByFiles,
  entriesByFolder,
  unpublishedEntries,
  getMediaDisplayURL,
  getMediaAsBlob,
  readFile,
  readFileMetadata,
  CMS_BRANCH_PREFIX,
  generateContentKey,
  isCMSLabel,
  labelToStatus,
  statusToLabel,
  DEFAULT_PR_BODY,
  MERGE_COMMIT_MESSAGE,
  isPreviewContext,
  getPreviewStatus,
  runWithLock,
  PreviewState,
  parseContentKey,
  createPointerFile,
  getLargeMediaFilteredMediaFiles,
  getLargeMediaPatternsFromGitAttributesFile,
  parsePointerFile,
  getPointerFileForMediaFileObj,
  branchFromContentKey,
  contentKeyFromBranch,
  blobToFileObj,
  requestWithBackoff,
  getDefaultBranchName,
  allEntriesByFolder,
  AccessTokenError,
  throwOnConflictingBranches,
  isHotkey,
  isKeyHotkey,
  isCodeHotkey,
};

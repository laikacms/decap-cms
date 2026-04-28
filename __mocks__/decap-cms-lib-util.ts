import { vi } from 'vitest';

export class APIError extends Error {
  status: number;
  api: string;
  constructor(message: string, status: number, api: string) {
    super(message);
    this.status = status;
    this.api = api;
    this.name = 'API_ERROR';
  }
}
export class AccessTokenError extends Error {}
export class ConfigurationError extends Error {}

export const CURSOR_COMPATIBILITY_SYMBOL = Symbol('cursor key for compatibility with old backends');
export class Cursor {
  static create = vi.fn(() => ({ wrapData: vi.fn(function(this: unknown) { return this; }) }));
}

export class EditorialWorkflowError extends Error {
  notUnderEditorialWorkflow = false;
}
export const EDITORIAL_WORKFLOW_ERROR = 'EDITORIAL_WORKFLOW_ERROR';

export const localForage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  iterate: vi.fn(),
  key: vi.fn(),
  keys: vi.fn(),
  length: vi.fn(),
  config: vi.fn(),
  createInstance: vi.fn(),
  defineDriver: vi.fn(),
  driver: vi.fn(),
  dropInstance: vi.fn(),
  ready: vi.fn(),
  setDriver: vi.fn(),
};

export const isAbsolutePath = vi.fn((path: string) => path.startsWith('/'));
export const basename = vi.fn((path: string, ext?: string) => {
  const base = path.split('/').pop() || '';
  return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
});
export const fileExtensionWithSeparator = vi.fn((path: string) => {
  const i = path.lastIndexOf('.');
  return i >= 0 ? path.slice(i) : '';
});
export const fileExtension = vi.fn((path: string) => {
  const i = path.lastIndexOf('.');
  return i >= 0 ? path.slice(i + 1) : '';
});
export const extname = vi.fn((path: string) => {
  const i = path.lastIndexOf('.');
  return i >= 0 ? path.slice(i) : '';
});
export const dirname = vi.fn((path: string) => path.split('/').slice(0, -1).join('/') || '.');
export const join = vi.fn((...parts: string[]) => parts.join('/').replace(/\/+/g, '/'));

export const onlySuccessfulPromises = vi.fn();
export const flowAsync = vi.fn();
export const promiseThen = vi.fn();

export const unsentRequest = {
  fetchWithTimeout: vi.fn(),
  performRequest: vi.fn(),
  withRoot: vi.fn(),
  withHeaders: vi.fn(),
  withBody: vi.fn(),
  withMethod: vi.fn(),
  withJSON: vi.fn(),
  withNoCache: vi.fn(),
  toFetchArguments: vi.fn(),
};

export const filterByExtension = vi.fn();
export const getAllResponses = vi.fn();
export const parseLinkHeader = vi.fn();
export const parseResponse = vi.fn();
export const responseParser = vi.fn();
export const getPathDepth = vi.fn();

export const loadScript = vi.fn();
export const getBlobSHA = vi.fn();
export const asyncLock = vi.fn(() => ({ acquire: vi.fn(), release: vi.fn() }));

export const entriesByFiles = vi.fn();
export const entriesByFolder = vi.fn();
export const unpublishedEntries = vi.fn();
export const getMediaDisplayURL = vi.fn();
export const getMediaAsBlob = vi.fn();
export const runWithLock = vi.fn();
export const blobToFileObj = vi.fn();
export const allEntriesByFolder = vi.fn();

export const readFile = vi.fn();
export const readFileMetadata = vi.fn();
export const isPreviewContext = vi.fn();
export const getPreviewStatus = vi.fn();
export const PreviewState = { Success: 'success', Other: 'other' };
export const requestWithBackoff = vi.fn();
export const getDefaultBranchName = vi.fn();
export const throwOnConflictingBranches = vi.fn();

export const CMS_BRANCH_PREFIX = 'cms/';
export const generateContentKey = vi.fn();
export const isCMSLabel = vi.fn();
export const labelToStatus = vi.fn();
export const statusToLabel = vi.fn();
export const DEFAULT_PR_BODY = '';
export const MERGE_COMMIT_MESSAGE = '';
export const parseContentKey = vi.fn();
export const branchFromContentKey = vi.fn();
export const contentKeyFromBranch = vi.fn();

export const createPointerFile = vi.fn();
export const getLargeMediaFilteredMediaFiles = vi.fn();
export const getLargeMediaPatternsFromGitAttributesFile = vi.fn();
export const parsePointerFile = vi.fn();
export const getPointerFileForMediaFileObj = vi.fn();

export const isHotkey = vi.fn();
export const isCodeHotkey = vi.fn();
export const isKeyHotkey = vi.fn();

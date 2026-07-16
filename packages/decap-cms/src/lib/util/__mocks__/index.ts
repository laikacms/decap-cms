import { type Mock, vi } from 'vitest';

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
  static create = vi.fn(() => ({
    wrapData: vi.fn(function(this: unknown) {
      return this;
    }),
  }));
}

export class EditorialWorkflowError extends Error {
  notUnderEditorialWorkflow = false;
}
export const EDITORIAL_WORKFLOW_ERROR = 'EDITORIAL_WORKFLOW_ERROR';

export const localForage: Record<string, Mock> = {
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

export const onlySuccessfulPromises: Mock = vi.fn();
export const flowAsync: Mock = vi.fn();
export const promiseThen: Mock = vi.fn();

export const unsentRequest: Record<string, Mock> = {
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

export const filterByExtension: Mock = vi.fn();
export const getAllResponses: Mock = vi.fn();
export const parseLinkHeader: Mock = vi.fn();
export const parseResponse: Mock = vi.fn();
export const responseParser: Mock = vi.fn();
export const getPathDepth: Mock = vi.fn();

export const loadScript: Mock = vi.fn();
export const getBlobSHA: Mock = vi.fn();
export const asyncLock: Mock = vi.fn(() => ({ acquire: vi.fn(), release: vi.fn() }));

export const entriesByFiles: Mock = vi.fn();
export const entriesByFolder: Mock = vi.fn();
export const unpublishedEntries: Mock = vi.fn();
export const getMediaDisplayURL: Mock = vi.fn();
export const getMediaAsBlob: Mock = vi.fn();
export const runWithLock: Mock = vi.fn();
export const blobToFileObj: Mock = vi.fn();
export const allEntriesByFolder: Mock = vi.fn();

export const readFile: Mock = vi.fn();
export const readFileMetadata: Mock = vi.fn();
export const isPreviewContext: Mock = vi.fn();
export const getPreviewStatus: Mock = vi.fn();
export const PreviewState = { Success: 'success', Other: 'other' };
export const requestWithBackoff: Mock = vi.fn();
export const getDefaultBranchName: Mock = vi.fn();
export const throwOnConflictingBranches: Mock = vi.fn();

export const CMS_BRANCH_PREFIX = 'cms/';
export const generateContentKey: Mock = vi.fn();
export const isCMSLabel: Mock = vi.fn();
export const labelToStatus: Mock = vi.fn();
export const statusToLabel: Mock = vi.fn();
export const DEFAULT_PR_BODY = '';
export const MERGE_COMMIT_MESSAGE = '';
export const parseContentKey: Mock = vi.fn();
export const branchFromContentKey: Mock = vi.fn();
export const contentKeyFromBranch: Mock = vi.fn();

export const createPointerFile: Mock = vi.fn();
export const getLargeMediaFilteredMediaFiles: Mock = vi.fn();
export const getLargeMediaPatternsFromGitAttributesFile: Mock = vi.fn();
export const parsePointerFile: Mock = vi.fn();
export const getPointerFileForMediaFileObj: Mock = vi.fn();

export const isHotkey: Mock = vi.fn();
export const isCodeHotkey: Mock = vi.fn();
export const isKeyHotkey: Mock = vi.fn();

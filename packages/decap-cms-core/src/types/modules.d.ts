// Declaration for the 'url' polyfill package
declare module 'url' {
  interface UrlObject {
    protocol?: string | null;
    slashes?: boolean | null;
    auth?: string | null;
    host?: string | null;
    port?: string | null;
    hostname?: string | null;
    hash?: string | null;
    search?: string | null;
    query?: string | { [key: string]: string | string[] } | null;
    pathname?: string | null;
    path?: string | null;
    href?: string | null;
  }

  export function parse(urlString: string, parseQueryString?: boolean, slashesDenoteHost?: boolean): UrlObject;
  export function format(urlObject: UrlObject): string;
  export function resolve(from: string, to: string): string;
}

// Declaration for decap-cms-lib-widgets
declare module 'decap-cms-lib-widgets' {
  export const stringTemplate: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    compileStringTemplate: (template: string, date?: Date | null, identifier?: string, data?: any, processor?: any) => string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseDateFromEntry: (entry: any, fieldName?: string | null) => Date | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseDateFromEntryData: (data: any, fieldName?: string | null) => Date | null;
    SLUG_MISSING_REQUIRED_DATE: string;
    keyToPathArray: (key: string) => string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addFileTemplateFields: (entryPath: string, fields: any, folder?: string) => any;
    extractTemplateVars: (template: string) => string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dateParsers: Record<string, (entry: any) => Date | undefined>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expandPath: (args: { data: any; path: string; paths?: string[] }) => string[];
  };
  
  export function validations(
    field: unknown,
    t: (key: string) => string
  ): Array<(value: unknown) => string | undefined>;
}

// Declaration for decap-cms-lib-util
declare module 'decap-cms-lib-util' {
  export class APIError extends Error {
    status: number;
    api: string;
    message: string;
    constructor(message: string, status: number, api: string);
  }
  
  export class EditorialWorkflowError extends Error {
    notUnderEditorialWorkflow: boolean;
    constructor(message: string, notUnderEditorialWorkflow: boolean);
  }
  
  // Constant for editorial workflow error checking
  export const EDITORIAL_WORKFLOW_ERROR: string;
  
  // User and Credentials types
  export interface Credentials {
    token?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  
  export interface User {
    login?: string;
    name?: string;
    email?: string;
    avatar_url?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  
  // Implementation types
  export interface ImplementationMediaFile {
    name: string;
    id: string;
    size?: number;
    displayURL?: string | { [key: string]: string };
    path: string;
    draft?: boolean;
    url?: string;
    file?: File;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  
  export interface ImplementationEntry {
    data: string;
    file: { path: string; label?: string; id?: string | null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  
  export interface DataFile {
    path: string;
    slug: string;
    raw: string;
    newPath?: string;
  }
  
  export interface UnpublishedEntryDiff {
    id: string;
    path: string;
    newFile: boolean;
  }
  
  export interface UnpublishedEntry {
    slug: string;
    collection: string;
    status: string;
    diffs: UnpublishedEntryDiff[];
    updatedAt: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type DisplayURL = string | { [key: string]: any };
  
  export interface Implementation {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  
  export interface AsyncLock {
    acquire<T>(fn: () => Promise<T>): Promise<T>;
  }
  
  export class Cursor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static create(...args: any[]): Cursor;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  
  export const CURSOR_COMPATIBILITY_SYMBOL: symbol;
  
  export function filterPromisesWith<T>(
    promises: Promise<T>[],
    filter: (result: T) => boolean
  ): Promise<T[]>;
  
  export function filterPromises<T>(
    promises: Promise<T>[],
    filter: (result: T) => boolean
  ): Promise<T[]>;
  
  export function resolvePromiseProperties<T extends Record<string, unknown>>(
    obj: T
  ): Promise<T>;
  
  export function then<T, R>(
    promise: Promise<T>,
    fn: (value: T) => R
  ): Promise<R>;
  
  export function onlySuccessfulPromises<T>(
    promises: Promise<T>[]
  ): Promise<T[]>;
  
  export function flowAsync<T>(...fns: Array<(arg: T) => Promise<T> | T>): (arg: T) => Promise<T>;
  
  export const localForage: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getItem(key: string): Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setItem(key: string, value: any): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
  
  export function basename(path: string, ext?: string): string;
  export function fileExtensionWithSeparator(path: string): string;
  export function fileExtension(path: string): string;
  
  export function getBlobSHA(blob: Blob): Promise<string>;
  
  export function asyncLock(): {
    acquire<T>(fn: () => Promise<T>): Promise<T>;
  };
  
  export function isAbsolutePath(path: string): boolean;
  
  export const CMS_BRANCH_PREFIX: string;
  export const DEFAULT_PR_BODY: string;
  export const MERGE_COMMIT_MESSAGE: string;
  
  export function isCMSLabel(label: string, prefix: string): boolean;
  export function labelToStatus(label: string, prefix: string): string;
  export function statusToLabel(status: string, prefix: string): string;
  export function generateContentKey(collectionName: string, slug: string): string;
  export function parseContentKey(contentKey: string): { collection: string; slug: string };
  
  export function contentKeyFromBranch(branch: string): string;
  export function branchFromContentKey(contentKey: string): string;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function runWithLock(lock: any, fn: () => Promise<any>, name: string): Promise<any>;
  
  export function blobToFileObj(name: string, blob: Blob): File;
  
  export function getPathDepth(path: string): number;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const unsentRequest: any;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function requestWithBackoff(req: any, attempt?: number): Promise<any>;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function readFile(id: string | null, fetchContent: () => Promise<any>, localForage: any, isText: boolean): Promise<any>;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function readFileMetadata(id: string | null, fetchMetadata: () => Promise<any>, localForage: any): Promise<any>;
  
  export function entriesByFiles(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extension: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFile: (path: string, id?: string | null) => Promise<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    files: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]>;
  
  export function entriesByFolder(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: any,
    extension: string,
    depth: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFile: (path: string, id?: string | null) => Promise<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listFiles: () => Promise<any[]>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]>;
  
  export function getMediaDisplayURL(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayURL: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readFile: (path: string, id?: string | null, options?: { parseText: boolean }) => Promise<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiUrl: string
  ): Promise<string>;
  
  export function getMediaAsBlob(
    path: string,
    id: string | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readFile: (path: string, id?: string | null, options?: { parseText: boolean }) => Promise<any>
  ): Promise<Blob>;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function getPreviewStatus(statuses: any[], config: any): any;
  
  export const PreviewState: {
    Other: string;
    Success: string;
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function allEntriesByFolder(args: any): Promise<any[]>;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function unpublishedEntries(args: any): Promise<any[]>;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function getMediaFiles(args: any): Promise<any[]>;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function persistLocalTree(args: any): Promise<any>;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function getDefaultBranchName(args: any): Promise<string>;
}

// Declaration for decap-cms-ui-default
declare module 'decap-cms-ui-default' {
  import type { ComponentType, ReactNode, CSSProperties } from 'react';
  
  export interface LoaderProps {
    active?: boolean;
    children?: ReactNode;
  }
  
  export const Loader: ComponentType<LoaderProps>;
  
  export interface IconProps {
    type: string;
    size?: string | number;
    className?: string;
    style?: CSSProperties;
  }
  
  export const Icon: ComponentType<IconProps>;
  
  export interface DropdownProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  
  export const Dropdown: ComponentType<DropdownProps>;
  export const DropdownItem: ComponentType<DropdownProps>;
  export const DropdownButton: ComponentType<DropdownProps>;
  export const StyledDropdownButton: ComponentType<DropdownProps>;
  
  export interface ToggleProps {
    active?: boolean;
    onChange?: (active: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  
  export const Toggle: ComponentType<ToggleProps>;
  
  export const colors: {
    [key: string]: string;
  };
  
  export const colorsRaw: {
    [key: string]: string;
  };
  
  export const lengths: {
    [key: string]: string;
  };
  
  export const components: {
    [key: string]: string;
  };
  
  export const buttons: {
    [key: string]: string;
  };
  
  export const shadows: {
    [key: string]: string;
  };
  
  export const borders: {
    [key: string]: string;
  };
  
  export const transitions: {
    [key: string]: string;
  };
  
  export const effects: {
    [key: string]: string;
  };
  
  export const zIndex: {
    [key: string]: number;
  };
  
  export const reactSelectStyles: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  
  export const GlobalStyles: ComponentType;
  
  export const ObjectWidgetTopBar: ComponentType<{
    allowAdd?: boolean;
    onAdd?: () => void;
    onAddType?: (type: string) => void;
    onCollapseToggle?: () => void;
    collapsed?: boolean;
    heading?: ReactNode;
    label?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    types?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }>;
  
  export const ListItemTopBar: ComponentType<{
    collapsed?: boolean;
    onCollapseToggle?: () => void;
    onRemove?: () => void;
    dragHandleHOC?: ComponentType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }>;
  
  export const FieldLabel: ComponentType<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }>;
}

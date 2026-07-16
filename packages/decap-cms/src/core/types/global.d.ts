import type { ComponentType } from 'react';
import type { CmsConfig } from './cms';

declare global {
  interface Window {
    CMS_CONFIG?: CmsConfig;
    CMS_ENV?: string;
  }

  // Build-time constants injected by bundler
  declare const DECAP_CMS_VERSION: string | undefined;
  declare const DECAP_CMS_APP_VERSION: string | undefined;
  declare const DECAP_CMS_CORE_VERSION: string | undefined;
}

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

  function parse(
    urlString: string,
    parseQueryString?: boolean,
    slashesDenoteHost?: boolean,
  ): UrlObject;
  function format(urlObject: UrlObject): string;
  function resolve(from: string, to: string): string;
}

// fuzzy: fuzzy string matching library
declare module 'fuzzy' {
  interface FilterOptions<T> {
    pre?: string;
    post?: string;
    extract?: (input: T) => string;
  }

  interface FilterResult<T> {
    string: string;
    index: number;
    score: number;
    original: T;
  }

  function filter<T>(pattern: string, arr: T[], opts?: FilterOptions<T>): FilterResult<T>[];

  function match(
    pattern: string,
    str: string,
    opts?: { pre?: string, post?: string },
  ): { rendered: string, score: number } | null;

  function test(pattern: string, str: string): boolean;

  export { filter, FilterOptions, FilterResult, match, test };
  export default { filter, match, test };
}

// copy-text-to-clipboard: simple clipboard utility
declare module 'copy-text-to-clipboard' {
  export default function copyToClipboard(text: string): boolean;
}

// react-scroll-sync: synchronized scrolling between React components
declare module 'react-scroll-sync' {
  import type { ComponentType, ReactNode } from 'react';

  export interface ScrollSyncProps {
    children?: ReactNode;
    onSync?: (el: Element) => void;
    proportional?: boolean;
    vertical?: boolean;
    horizontal?: boolean;
    enabled?: boolean;
  }

  export interface ScrollSyncPaneProps {
    children?: ReactNode;
    attachTo?: HTMLElement;
    group?: string | string[];
    enabled?: boolean;
  }

  export const ScrollSync: ComponentType<ScrollSyncProps>;
  export const ScrollSyncPane: ComponentType<ScrollSyncPaneProps>;
}

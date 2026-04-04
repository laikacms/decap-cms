import type { CmsConfig } from './cms';

declare global {
  interface Window {
    CMS_CONFIG?: CmsConfig;
    CMS_ENV?: string;
  }
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

  function parse(urlString: string, parseQueryString?: boolean, slashesDenoteHost?: boolean): UrlObject;
  function format(urlObject: UrlObject): string;
  function resolve(from: string, to: string): string;
}

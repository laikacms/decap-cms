export const lazy = <T>(func: () => T) => {
  let instance: T | null = null;
  return (): T => {
    if (!instance) {
      instance = func();
    }
    return instance;
  };
};

export type Lazy<T> = () => T;

export const lazyAsync = <T>(func: () => Promise<T>) => {
  let instance: T | null = null;
  return async (): Promise<T> => {
    if (!instance) {
      instance = await func();
    }
    return instance;
  };
};

export type LazyAsync<T> = () => Promise<T> | T;

export const memoizeOne = <I, O>(func: (t: I) => O): ((t: I) => O) => {
  let cache: { 0: I; 1: O } | undefined; // Keep just 1 item to prevent memory leaks
  return (i: I) => {
    if (cache?.[0] === i) return cache[1];
    const result = func(i);
    cache = [i, result];
    return result;
  };
};

export const Url = {
  isAbsolute: (url: string | undefined | null) =>
    typeof url === 'string' && /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url),
  join: (url1: string | undefined | null, url2: string | undefined | null): string => {
    url1 = Url.normalize(url1);
    url2 = Url.normalize(url2);
    if (!url1) return url2 ?? '';
    if (!url2) return url1;

    if (Url.isAbsolute(url2)) return url2;
    else return url1 + url2;
  },
  normalize: (url: string | undefined | null): string => {
    if (url && url.endsWith('/')) url = url.slice(0, -1);
    if (Url.isAbsolute(url)) return url as string;
    if (url && !url.startsWith('/')) url = '/' + url;
    return url as string;
  },
  combine: (...urls: (string | undefined | null)[]): string => {
    return urls.reduce((acc, url) => Url.join(acc, url), '') || '';
  },
};

export const Paths = {
  pathToSegments: (path: string) => {
    const segments = path
      .split('/')
      .map(x => x.trim())
      .filter(x => x.length > 0);
    return segments;
  },
  toSegments: (path: string) => Paths.pathToSegments(path),
  combine: (...segments: string[]) => {
    const path = segments
      .map(x => x.trim())
      .filter(x => x.length > 0)
      .join('/');
    return path;
  },
};

export const TemplateLiteral = {};

export const Header = {};

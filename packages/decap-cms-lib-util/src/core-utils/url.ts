export const isAbsolute = (url: string | undefined | null) =>
  typeof url === 'string' && /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url);
export const join = (url1: string | undefined | null, url2: string | undefined | null): string => {
  url1 = normalize(url1);
  url2 = normalize(url2);
  if (!url1) return url2 ?? '';
  if (!url2) return url1;

  if (isAbsolute(url2)) return url2;
  else return url1 + url2;
};
export const normalize = (url: string | undefined | null): string => {
  if (url && url.endsWith('/')) url = url.slice(0, -1);
  if (isAbsolute(url)) return url as string;
  if (url && !url.startsWith('/')) url = '/' + url;
  return url as string;
};
export const combine = (...urls: (string | undefined | null)[]): string => {
  return urls.reduce((acc, url) => join(acc, url), '') || '';
};

import flow from 'lodash/flow';
import fromPairs from 'lodash/fromPairs';
import map from 'lodash/fp/map.js';

import unsentRequest from './unsentRequest.js';
import { APIError } from './errors/APIError.js';

type Formatter = (res: Response) => Promise<string | Blob | unknown>;

export function filterByExtension(file: { path: string }, extension: string) {
  const path = file?.path || '';
  return path.endsWith(extension.startsWith('.') ? extension : `.${extension}`);
}

function catchFormatErrors(format: string, formatter: Formatter) {
  return (res: Response) => {
    try {
      return formatter(res);
    } catch (err: unknown) {
      const error = err as Error;
      throw new Error(
        `Response cannot be parsed into the expected format (${format}): ${error.message}`,
        { cause: err },
      );
    }
  };
}

const responseFormatters = new Map<string, Formatter>([
  [
    'json',
    async (res: Response) => {
      const contentType = res.headers.get('Content-Type') || '';
      if (!contentType.startsWith('application/json') && !contentType.startsWith('text/json')) {
        throw new Error(`${contentType} is not a valid JSON Content-Type`);
      }
      return res.json();
    },
  ],
  ['text', async (res: Response) => res.text()],
  ['blob', async (res: Response) => res.blob()],
]);

// Wrap formatters with error catching
const wrappedFormatters = new Map<string, Formatter>();
responseFormatters.forEach((formatter, format) => {
  wrappedFormatters.set(format, catchFormatErrors(format, formatter));
});

type Format = 'json' | 'text' | 'blob';

export async function parseResponse<F extends Format>(
  res: Response,
  {
    expectingOk = true,
    format = 'text' as F,
    apiName = '',
  }: { expectingOk?: boolean; format?: F; apiName?: string },
): Promise<F extends 'json' ? unknown : F extends 'text' ? string : Blob> {
  let body: unknown;
  try {
    const formatter = wrappedFormatters.get(format);
    if (!formatter) {
      throw new Error(`${format} is not a supported response format.`);
    }
    body = await formatter(res);
  } catch (err: unknown) {
    const error = err as Error;
    throw new APIError(error.message, res.status, apiName);
  }
  if (expectingOk && !res.ok) {
    const isJSON = format === 'json';
    const jsonBody = body as
      | { message?: string; msg?: string; error?: { message?: string } }
      | undefined;
    const message = isJSON ? jsonBody?.message || jsonBody?.msg || jsonBody?.error?.message : body;
    throw new APIError(isJSON && message ? String(message) : String(body), res.status, apiName);
  }
  return body as F extends 'json' ? unknown : F extends 'text' ? string : Blob;
}

export function responseParser<F extends Format>(options: {
  expectingOk?: boolean;
  format: F;
  apiName: string;
}) {
  return (res: Response) => parseResponse(res, options);
}

export function parseLinkHeader(header: string | null) {
  if (!header) {
    return {};
  }
  return flow([
    linksString => linksString.split(','),
    map((str: string) => str.trim().split(';')),
    map(([linkStr, keyStr]) => [
      keyStr.match(/rel="(.*?)"/)[1],
      linkStr
        .trim()
        .match(/<(.*?)>/)[1]
        .replace(/\+/g, '%20'),
    ]),
    fromPairs,
  ])(header);
}

export async function getAllResponses(
  url: string,
  options: { headers?: {} } = {},
  linkHeaderRelName: string,
  nextUrlProcessor: (url: string) => string,
) {
  const maxResponses = 30;
  let responseCount = 1;

  let req = unsentRequest.fromFetchArguments(url, options);

  const pageResponses = [];

  while (req && responseCount < maxResponses) {
    const pageResponse = await unsentRequest.performRequest(req);
    const linkHeader = pageResponse.headers.get('Link');
    const nextURL = linkHeader && parseLinkHeader(linkHeader)[linkHeaderRelName];

    const { headers = {} } = options;
    req = nextURL && unsentRequest.fromFetchArguments(nextUrlProcessor(nextURL), { headers });
    pageResponses.push(pageResponse);
    responseCount++;
  }

  return pageResponses;
}

export function getPathDepth(path: string) {
  const depth = path.split('/').length;
  return depth;
}

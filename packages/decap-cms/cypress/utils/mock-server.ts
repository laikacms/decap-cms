import { mockServerClient } from 'mockserver-client';
import mockserver from 'mockserver-node';

const PROXY_PORT = 1080;
const PROXY_HOST = 'localhost';

export interface RecordedExpectation {
  httpRequest: {
    headers: Record<string, string[]>,
    path: string,
    method?: string,
    [key: string]: unknown,
  };
  httpResponse: unknown;
}

export const start = (): Promise<void> =>
  mockserver.start_mockserver({
    serverPort: PROXY_PORT,
  });

export const stop = (): Promise<void> =>
  mockserver.stop_mockserver({
    serverPort: PROXY_PORT,
  });

export const retrieveRecordedExpectations = async (): Promise<RecordedExpectation[]> => {
  const promise = new Promise<any[]>((resolve, reject) => {
    mockServerClient(PROXY_HOST, PROXY_PORT)
      .retrieveRecordedExpectations({})
      .then(
        (result: any) => resolve(result as any[]),
        reject,
      );
  });

  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<any[]>(resolve => {
    timeout = setTimeout(() => {
      console.warn('retrieveRecordedExpectations timeout');
      resolve([]);
    }, 3000);
  });

  let recorded = await Promise.race([promise, timeoutPromise]);
  clearTimeout(timeout!);

  recorded = recorded.filter(({ httpRequest }: any) => {
    const headers = httpRequest.headers || {};
    // Handle both array format and object format for headers
    let hostValues: string[];
    if (Array.isArray(headers)) {
      const hostHeader = headers.find((h: any) => h.name === 'Host');
      hostValues = hostHeader?.values || [];
    } else {
      hostValues = headers.Host || [];
    }

    // Host is an array of strings
    return (
      hostValues.includes('api.github.com')
      || (hostValues.includes('gitlab.com') && httpRequest.path?.includes('api/v4'))
      || hostValues.includes('api.bitbucket.org')
      || (hostValues.includes('bitbucket.org') && httpRequest.path?.includes('info/lfs'))
      || hostValues.includes('api.media.atlassian.com')
      || hostValues.some((host: string) => host.includes('netlify.com'))
      || hostValues.some((host: string) => host.includes('netlify.app'))
      || hostValues.some((host: string) => host.includes('s3.amazonaws.com'))
    );
  });

  return recorded as RecordedExpectation[];
};

export const resetMockServerState = async (): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    mockServerClient(PROXY_HOST, PROXY_PORT)
      .reset()
      .then(
        () => resolve(),
        reject,
      );
  });
};

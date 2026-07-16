import path from 'path';
import simpleGit from 'simple-git';

import type { SimpleGit } from 'simple-git';

const GIT_SSH_COMMAND = 'ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no';
const GIT_SSL_NO_VERIFY = 'true';

interface TaskData {
  spec: string;
  testName: string;
}

interface HttpRequest {
  method: string;
  path: string;
  queryStringParameters?: Record<string, string>;
  body?: unknown;
  headers: Record<string, string>;
}

interface HttpResponse {
  statusCode: number;
  headers: Record<string, string[]>;
  body?: unknown;
}

interface Expectation {
  httpRequest: HttpRequest;
  httpResponse: HttpResponse;
}

interface CypressRouteOptions {
  body: unknown;
  method: string;
  url: string;
  headers: Record<string, string>;
  response: unknown;
  status: number;
}

export const getExpectationsFilename = (taskData: TaskData): string => {
  const { spec, testName } = taskData;
  const basename = `${spec}__${testName}`;
  const fixtures = path.join(__dirname, '..', 'fixtures');
  const filename = path.join(fixtures, `${basename}.json`);

  return filename;
};

const HEADERS_TO_IGNORE = [
  'Date',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'ETag',
  'Last-Modified',
  'X-GitHub-Request-Id',
  'X-NF-Request-ID',
  'X-Request-Id',
  'X-Runtime',
  'RateLimit-Limit',
  'RateLimit-Observed',
  'RateLimit-Remaining',
  'RateLimit-Reset',
  'RateLimit-ResetTime',
  'GitLab-LB',
].map(h => h.toLowerCase());

type RequestBodySanitizer = (httpRequest: HttpRequest) => unknown;
type ResponseBodySanitizer = (httpRequest: HttpRequest, httpResponse: HttpResponse) => unknown;

export const transformRecordedData = (
  expectation: Expectation,
  requestBodySanitizer: RequestBodySanitizer,
  responseBodySanitizer: ResponseBodySanitizer,
): CypressRouteOptions => {
  const { httpRequest, httpResponse } = expectation;

  const responseHeaders: Record<string, string> = {};

  Object.keys(httpResponse.headers)
    .filter(key => !HEADERS_TO_IGNORE.includes(key.toLowerCase()))
    .forEach(key => {
      responseHeaders[key] = httpResponse.headers[key][0];
    });

  let queryString: string | undefined;
  if (httpRequest.queryStringParameters) {
    const { queryStringParameters } = httpRequest;

    queryString = Object.keys(queryStringParameters)
      .map(key => `${key}=${queryStringParameters[key]}`)
      .join('&');
  }

  const body = requestBodySanitizer(httpRequest);
  const responseBody = responseBodySanitizer(httpRequest, httpResponse);

  const cypressRouteOptions: CypressRouteOptions = {
    body,
    method: httpRequest.method,
    url: queryString ? `${httpRequest.path}?${queryString}` : httpRequest.path,
    headers: responseHeaders,
    response: responseBody,
    status: httpResponse.statusCode,
  };

  return cypressRouteOptions;
};

export function getGitClient(repoDir?: string): SimpleGit {
  const git = simpleGit(repoDir).env({ ...process.env, GIT_SSH_COMMAND, GIT_SSL_NO_VERIFY });
  return git;
}

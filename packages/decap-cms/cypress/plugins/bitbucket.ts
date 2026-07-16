import { merge } from 'lodash-es';
import fetch from 'node-fetch';
import fs from 'node:fs/promises';
import path from 'path';

import { updateConfig } from '../utils/config';
import { resetMockServerState, retrieveRecordedExpectations } from '../utils/mock-server';
import { escapeRegExp } from '../utils/regexp';
import { getExpectationsFilename, getGitClient, transformRecordedData as transformData } from './common';

import type { RecordedExpectation } from '../utils/mock-server';

const BITBUCKET_REPO_OWNER_SANITIZED_VALUE = 'owner';
const BITBUCKET_REPO_NAME_SANITIZED_VALUE = 'repo';
const BITBUCKET_REPO_TOKEN_SANITIZED_VALUE = 'fakeToken';

const FAKE_OWNER_USER = {
  name: 'owner',
  display_name: 'owner',
  links: {
    avatar: {
      href: 'https://avatars1.githubusercontent.com/u/7892489?v=4',
    },
  },
  nickname: 'owner',
};

interface BitBucketEnvs {
  owner: string;
  repo: string;
  token: string;
}

async function getEnvs(): Promise<BitBucketEnvs> {
  const {
    BITBUCKET_REPO_OWNER: owner,
    BITBUCKET_REPO_NAME: repo,
    BITBUCKET_OUATH_CONSUMER_KEY: consumerKey,
    BITBUCKET_OUATH_CONSUMER_SECRET: consumerSecret,
  } = process.env;
  if (!owner || !repo || !consumerKey || !consumerSecret) {
    throw new Error(
      'Please set BITBUCKET_REPO_OWNER, BITBUCKET_REPO_NAME, BITBUCKET_OUATH_CONSUMER_KEY, BITBUCKET_OUATH_CONSUMER_SECRET environment variables',
    );
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');

  const response = await fetch(
    `https://${consumerKey}:${consumerSecret}@bitbucket.org/site/oauth2/access_token`,
    { method: 'POST', body: params },
  );
  const { access_token: token } = await response.json() as { access_token: string };

  return { owner, repo, token };
}

const API_URL = 'https://api.bitbucket.org/2.0/';

function get(token: string, apiPath: string): Promise<any> {
  return fetch(`${API_URL}${apiPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(r => r.json());
}

function post(token: string, apiPath: string, body?: string): Promise<any> {
  return fetch(`${API_URL}${apiPath}`, {
    method: 'POST',
    ...(body ? { body } : {}),
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

function del(token: string, apiPath: string): Promise<any> {
  return fetch(`${API_URL}${apiPath}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

interface RepoData {
  owner: string;
  repo: string;
  tempDir: string;
}

async function prepareTestBitBucketRepo({ lfs }: { lfs?: boolean }): Promise<RepoData> {
  const { owner, repo, token } = await getEnvs();

  // postfix a random string to avoid collisions
  const postfix = Math.random()
    .toString(32)
    .slice(2);
  const testRepoName = `${repo}-${Date.now()}-${postfix}`;

  console.log('Creating repository', testRepoName);
  await post(token, `repositories/${owner}/${testRepoName}`, JSON.stringify({ scm: 'git' }));

  const tempDir = path.join('.temp', testRepoName);
  await fs.rm(tempDir, { recursive: true, force: true });
  let git = getGitClient();

  const repoUrl = `git@bitbucket.org:${owner}/${repo}.git`;

  console.log('Cloning repository', repoUrl);
  await git.clone(repoUrl, tempDir);
  git = getGitClient(tempDir);

  console.log('Pushing to new repository', testRepoName);

  await git.removeRemote('origin');
  await git.addRemote(
    'origin',
    `https://x-token-auth:${token}@bitbucket.org/${owner}/${testRepoName}`,
  );
  await git.push(['-u', 'origin', 'master']);

  if (lfs) {
    console.log(`Enabling LFS for repo ${owner}/${repo}`);
    await git.addConfig('commit.gpgsign', 'false');
    await git.raw(['lfs', 'track', '*.png', '*.jpg']);
    await git.add('.gitattributes');
    await git.commit('chore: track images files under LFS');
    await git.push('origin', 'master');
  }

  return { owner, repo: testRepoName, tempDir };
}

interface AuthenticatedUser {
  name?: string;
  display_name?: string;
  links?: {
    avatar?: {
      href?: string,
    },
  };
  nickname?: string;
  token: string;
  backendName: string;
}

async function getUser(): Promise<AuthenticatedUser> {
  const { token } = await getEnvs();
  const user = await get(token, 'user');
  return { ...user, token, backendName: 'bitbucket' };
}

async function deleteRepositories({ owner, repo, tempDir }: RepoData): Promise<void> {
  const { token } = await getEnvs();

  console.log('Deleting repository', `${owner}/${repo}`);
  await fs.rm(tempDir, { recursive: true, force: true });

  await del(token, `repositories/${owner}/${repo}`);
}

async function resetOriginRepo({ owner, repo, tempDir }: RepoData): Promise<void> {
  console.log('Resetting origin repo:', `${owner}/${repo}`);

  const { token } = await getEnvs();

  const pullRequests = await get(token, `repositories/${owner}/${repo}/pullrequests`);
  const ids = pullRequests.values.map((mr: any) => mr.id);

  console.log('Closing pull requests:', ids);
  await Promise.all(
    ids.map((id: number) => post(token, `repositories/${owner}/${repo}/pullrequests/${id}/decline`)),
  );
  const branches = await get(token, `repositories/${owner}/${repo}/refs/branches`);
  const toDelete = branches.values.filter((b: any) => b.name !== 'master').map((b: any) => b.name);

  console.log('Deleting branches', toDelete);
  await Promise.all(
    toDelete.map((branch: string) => del(token, `repositories/${owner}/${repo}/refs/branches/${branch}`)),
  );

  console.log('Resetting master');
  const git = getGitClient(tempDir);
  await git.push(['--force', 'origin', 'master']);
  console.log('Done resetting origin repo:', `${owner}/${repo}`);
}

async function resetRepositories({ owner, repo, tempDir }: RepoData): Promise<void> {
  await resetOriginRepo({ owner, repo, tempDir });
}

interface BackendOptions {
  lfs?: boolean;
  backend?: {
    repo?: string,
    [key: string]: unknown,
  };
  [key: string]: unknown;
}

interface SetupResult {
  owner: string;
  repo: string;
  tempDir?: string;
  user: AuthenticatedUser;
  mockResponses: boolean;
}

export async function setupBitBucket(options: BackendOptions): Promise<SetupResult> {
  const { lfs = false, ...rest } = options;
  if (process.env.RECORD_FIXTURES) {
    console.log('Running tests in "record" mode - live data with be used!');
    const [user, repoData] = await Promise.all([getUser(), prepareTestBitBucketRepo({ lfs })]);

    await updateConfig(config => {
      merge(config, rest, {
        backend: {
          repo: `${repoData.owner}/${repoData.repo}`,
        },
      });
    });

    return { ...repoData, user, mockResponses: false };
  } else {
    console.log('Running tests in "playback" mode - local data with be used');

    await updateConfig(config => {
      merge(config, rest, {
        backend: {
          repo: `${BITBUCKET_REPO_OWNER_SANITIZED_VALUE}/${BITBUCKET_REPO_NAME_SANITIZED_VALUE}`,
        },
      });
    });

    return {
      owner: BITBUCKET_REPO_OWNER_SANITIZED_VALUE,
      repo: BITBUCKET_REPO_NAME_SANITIZED_VALUE,
      user: {
        ...FAKE_OWNER_USER,
        token: BITBUCKET_REPO_TOKEN_SANITIZED_VALUE,
        backendName: 'bitbucket',
      },

      mockResponses: true,
    };
  }
}

interface TaskData {
  owner?: string;
  repo?: string;
  tempDir?: string;
  user?: AuthenticatedUser;
  spec?: string;
  testName?: string;
  [key: string]: unknown;
}

export async function teardownBitBucket(taskData: TaskData): Promise<null> {
  if (process.env.RECORD_FIXTURES) {
    await deleteRepositories(taskData as RepoData);
  }

  return null;
}

export async function setupBitBucketTest(taskData: TaskData): Promise<null> {
  if (process.env.RECORD_FIXTURES) {
    await resetRepositories(taskData as RepoData);
    await resetMockServerState();
  }

  return null;
}

interface SanitizeOptions {
  owner: string;
  repo: string;
  token: string;
  ownerName?: string;
}

const sanitizeString = (str: string, { owner, repo, token, ownerName }: SanitizeOptions): string => {
  let replaced = str
    .replace(new RegExp(escapeRegExp(owner), 'g'), BITBUCKET_REPO_OWNER_SANITIZED_VALUE)
    .replace(new RegExp(escapeRegExp(repo), 'g'), BITBUCKET_REPO_NAME_SANITIZED_VALUE)
    .replace(new RegExp(escapeRegExp(token), 'g'), BITBUCKET_REPO_TOKEN_SANITIZED_VALUE)
    .replace(
      new RegExp('https://secure.gravatar.+?/u/.+?v=\\d', 'g'),
      `${FAKE_OWNER_USER.links.avatar.href}`,
    )
    .replace(new RegExp(/\?token=.+?&/g), 'token=fakeToken&')
    .replace(new RegExp(/&client=.+?&/g), 'client=fakeClient&');

  if (ownerName) {
    replaced = replaced.replace(
      new RegExp(escapeRegExp(ownerName), 'g'),
      FAKE_OWNER_USER.display_name,
    );
  }

  return replaced;
};

interface HttpRequest {
  method: string;
  path: string;
  body?: {
    type?: string,
    json?: string | Record<string, unknown>,
    string?: string,
    base64Bytes?: string,
    contentType?: string,
  };
  headers: Record<string, string>;
}

interface HttpResponse {
  statusCode: number;
  headers: Record<string, string[]>;
  body?: {
    type?: string,
    string?: string,
    base64Bytes?: string,
    json?: unknown,
  } | string;
}

interface Expectation {
  httpRequest: HttpRequest;
  httpResponse: HttpResponse;
}

const transformRecordedData = (expectation: Expectation, toSanitize: SanitizeOptions): unknown => {
  const requestBodySanitizer = (httpRequest: HttpRequest): unknown => {
    let body: unknown;
    if (httpRequest.body && httpRequest.body.type === 'JSON' && httpRequest.body.json) {
      const bodyObject = typeof httpRequest.body.json === 'string'
        ? JSON.parse(httpRequest.body.json)
        : httpRequest.body.json;
      if (bodyObject.encoding === 'base64') {
        // sanitize encoded data
        const decodedBody = Buffer.from(bodyObject.content, 'base64').toString('binary');
        const sanitizedContent = sanitizeString(decodedBody, toSanitize);
        const sanitizedEncodedContent = Buffer.from(sanitizedContent, 'binary').toString('base64');
        bodyObject.content = sanitizedEncodedContent;
        body = JSON.stringify(bodyObject);
      } else {
        body = typeof httpRequest.body.json === 'string'
          ? httpRequest.body.json
          : JSON.stringify(httpRequest.body.json);
      }
    } else if (httpRequest.body && httpRequest.body.type === 'STRING' && httpRequest.body.string) {
      body = httpRequest.body.string;
    } else if (
      httpRequest.body
      && httpRequest.body.type === 'BINARY'
      && httpRequest.body.base64Bytes
    ) {
      body = {
        encoding: 'base64',
        content: httpRequest.body.base64Bytes,
        contentType: httpRequest.body.contentType,
      };
    }
    return body;
  };

  const responseBodySanitizer = (httpRequest: HttpRequest, httpResponse: HttpResponse): unknown => {
    let responseBody: unknown = null;
    const body = httpResponse.body;
    if (body && typeof body === 'object' && 'string' in body && body.string) {
      responseBody = body.string;
    } else if (
      body
      && typeof body === 'object'
      && body.type === 'BINARY'
      && 'base64Bytes' in body
      && body.base64Bytes
    ) {
      responseBody = {
        encoding: 'base64',
        content: body.base64Bytes,
      };
    } else if (body) {
      responseBody = body;
    }

    // replace recorded user with fake one
    if (
      responseBody
      && httpRequest.path === '/2.0/user'
      && httpRequest.headers.Host?.includes('api.bitbucket.org')
    ) {
      responseBody = JSON.stringify(FAKE_OWNER_USER);
    }

    return responseBody;
  };

  const cypressRouteOptions = transformData(
    expectation,
    requestBodySanitizer,
    responseBodySanitizer,
  );

  return cypressRouteOptions;
};

export async function teardownBitBucketTest(taskData: TaskData): Promise<null> {
  if (process.env.RECORD_FIXTURES) {
    await resetRepositories(taskData as RepoData);

    try {
      const filename = getExpectationsFilename(taskData as { spec: string, testName: string });

      console.log('Persisting recorded data for test:', path.basename(filename));

      const { owner, token } = await getEnvs();

      const expectations = await retrieveRecordedExpectations();

      const toSanitize: SanitizeOptions = {
        owner,
        repo: taskData.repo!,
        token,
        ownerName: taskData.user?.name,
      };
      // transform the mock proxy recorded requests into Cypress route format
      const toPersist = expectations.map((expectation: RecordedExpectation) =>
        transformRecordedData(expectation as unknown as Expectation, toSanitize)
      );

      const toPersistString = sanitizeString(JSON.stringify(toPersist, null, 2), toSanitize);

      await fs.writeFile(filename, toPersistString);
    } catch (e) {
      console.log(e);
    }

    await resetMockServerState();
  }

  return null;
}

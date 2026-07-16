import { Gitlab } from 'gitlab';
import { merge } from 'lodash-es';
import fs from 'node:fs/promises';
import path from 'path';

import { updateConfig } from '../utils/config';
import { resetMockServerState, retrieveRecordedExpectations } from '../utils/mock-server';
import { escapeRegExp } from '../utils/regexp';
import { getExpectationsFilename, getGitClient, transformRecordedData as transformData } from './common';

import type { RecordedExpectation } from '../utils/mock-server';

const GITLAB_REPO_OWNER_SANITIZED_VALUE = 'owner';
const GITLAB_REPO_NAME_SANITIZED_VALUE = 'repo';
const GITLAB_REPO_TOKEN_SANITIZED_VALUE = 'fakeToken';

const FAKE_OWNER_USER = {
  id: 1,
  name: 'owner',
  username: 'owner',
  avatar_url: 'https://avatars1.githubusercontent.com/u/7892489?v=4',
  email: 'owner@email.com',
  login: 'owner',
};

function getGitLabClient(token: string): InstanceType<typeof Gitlab> {
  const client = new Gitlab({
    token,
  });

  return client;
}

interface GitLabEnvs {
  owner: string;
  repo: string;
  token: string;
}

function getEnvs(): GitLabEnvs {
  const {
    GITLAB_REPO_OWNER: owner,
    GITLAB_REPO_NAME: repo,
    GITLAB_REPO_TOKEN: token,
  } = process.env;
  if (!owner || !repo || !token) {
    throw new Error(
      'Please set GITLAB_REPO_OWNER, GITLAB_REPO_NAME, GITLAB_REPO_TOKEN environment variables',
    );
  }
  return { owner, repo, token };
}

interface RepoData {
  owner: string;
  repo: string;
  tempDir: string;
}

async function prepareTestGitLabRepo(): Promise<RepoData> {
  const { owner, repo, token } = getEnvs();

  // postfix a random string to avoid collisions
  const postfix = Math.random()
    .toString(32)
    .slice(2);
  const testRepoName = `${repo}-${Date.now()}-${postfix}`;

  const client = getGitLabClient(token);

  console.log('Creating repository', testRepoName);
  await (client.Projects as any).create({
    name: testRepoName,
    lfs_enabled: false,
  });

  const tempDir = path.join('.temp', testRepoName);
  await fs.rm(tempDir, { recursive: true, force: true });
  let git = getGitClient();

  const repoUrl = `git@gitlab.com:${owner}/${repo}.git`;

  console.log('Cloning repository', repoUrl);
  await git.clone(repoUrl, tempDir);
  git = getGitClient(tempDir);

  console.log('Pushing to new repository', testRepoName);

  await git.removeRemote('origin');
  await git.addRemote('origin', `https://oauth2:${token}@gitlab.com/${owner}/${testRepoName}`);
  await git.push(['-u', 'origin', 'master']);

  await (client.ProtectedBranches as any).unprotect(`${owner}/${testRepoName}`, 'master');

  return { owner, repo: testRepoName, tempDir };
}

interface AuthenticatedUser {
  id?: number;
  name?: string;
  username?: string;
  avatar_url?: string;
  email?: string;
  login?: string;
  token: string;
  backendName: string;
}

async function getAuthenticatedUser(token: string): Promise<AuthenticatedUser> {
  const client = getGitLabClient(token);
  const user = await (client.Users as any).current();
  return { ...user, token, backendName: 'gitlab' };
}

async function getUser(): Promise<AuthenticatedUser> {
  const { token } = getEnvs();
  return getAuthenticatedUser(token);
}

async function deleteRepositories({ owner, repo, tempDir }: RepoData): Promise<void> {
  const { token } = getEnvs();

  const errorHandler = (e: { status?: number }) => {
    if (e.status !== 404) {
      throw e;
    }
  };

  console.log('Deleting repository', `${owner}/${repo}`);
  await fs.rm(tempDir, { recursive: true, force: true });

  const client = getGitLabClient(token);
  await (client.Projects as any).remove(`${owner}/${repo}`).catch(errorHandler);
}

async function resetOriginRepo({ owner, repo, tempDir }: RepoData): Promise<void> {
  console.log('Resetting origin repo:', `${owner}/${repo}`);

  const { token } = getEnvs();
  const client = getGitLabClient(token);

  const projectId = `${owner}/${repo}`;
  const mergeRequests = await (client.MergeRequests as any).all({
    projectId,
    state: 'opened',
  });
  const ids = mergeRequests.map((mr: any) => mr.iid);
  console.log('Closing merge requests:', ids);
  await Promise.all(
    ids.map((id: number) => (client.MergeRequests as any).edit(projectId, id, { state_event: 'close' })),
  );
  const branches = await (client.Branches as any).all(projectId);
  const toDelete = branches.filter((b: any) => b.name !== 'master').map((b: any) => b.name);

  console.log('Deleting branches', toDelete);
  await Promise.all(toDelete.map((branch: string) => (client.Branches as any).remove(projectId, branch)));

  console.log('Resetting master');
  const git = getGitClient(tempDir);
  await git.push(['--force', 'origin', 'master']);
  console.log('Done resetting origin repo:', `${owner}/${repo}`);
}

async function resetRepositories({ owner, repo, tempDir }: RepoData): Promise<void> {
  await resetOriginRepo({ owner, repo, tempDir });
}

interface BackendOptions {
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

export async function setupGitLab(options: BackendOptions): Promise<SetupResult> {
  if (process.env.RECORD_FIXTURES) {
    console.log('Running tests in "record" mode - live data with be used!');
    const [user, repoData] = await Promise.all([getUser(), prepareTestGitLabRepo()]);

    await updateConfig(config => {
      merge(config, options, {
        backend: {
          repo: `${repoData.owner}/${repoData.repo}`,
        },
      });
    });

    return { ...repoData, user, mockResponses: false };
  } else {
    console.log('Running tests in "playback" mode - local data with be used');

    await updateConfig(config => {
      merge(config, options, {
        backend: {
          repo: `${GITLAB_REPO_OWNER_SANITIZED_VALUE}/${GITLAB_REPO_NAME_SANITIZED_VALUE}`,
        },
      });
    });

    return {
      owner: GITLAB_REPO_OWNER_SANITIZED_VALUE,
      repo: GITLAB_REPO_NAME_SANITIZED_VALUE,
      user: { ...FAKE_OWNER_USER, token: GITLAB_REPO_TOKEN_SANITIZED_VALUE, backendName: 'gitlab' },

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

export async function teardownGitLab(taskData: TaskData): Promise<null> {
  if (process.env.RECORD_FIXTURES) {
    await deleteRepositories(taskData as RepoData);
  }

  return null;
}

export async function setupGitLabTest(taskData: TaskData): Promise<null> {
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
    .replace(new RegExp(escapeRegExp(owner), 'g'), GITLAB_REPO_OWNER_SANITIZED_VALUE)
    .replace(new RegExp(escapeRegExp(repo), 'g'), GITLAB_REPO_NAME_SANITIZED_VALUE)
    .replace(new RegExp(escapeRegExp(token), 'g'), GITLAB_REPO_TOKEN_SANITIZED_VALUE)
    .replace(
      new RegExp('https://secure.gravatar.+?/u/.+?v=\\d', 'g'),
      `${FAKE_OWNER_USER.avatar_url}`,
    );

  if (ownerName) {
    replaced = replaced.replace(new RegExp(escapeRegExp(ownerName), 'g'), FAKE_OWNER_USER.name);
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

export const transformRecordedData = (expectation: Expectation, toSanitize: SanitizeOptions): unknown => {
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
        body = JSON.stringify(bodyObject);
      }
    } else if (httpRequest.body && httpRequest.body.type === 'STRING' && httpRequest.body.string) {
      body = sanitizeString(httpRequest.body.string, toSanitize);
    } else if (httpRequest.body) {
      const str = typeof httpRequest.body !== 'string' ? JSON.stringify(httpRequest.body) : httpRequest.body;
      body = sanitizeString(str, toSanitize);
    }
    return body;
  };

  const responseBodySanitizer = (httpRequest: HttpRequest, httpResponse: HttpResponse): unknown => {
    let responseBody;
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
    } else if (body && typeof body === 'object' && 'json' in body && body.json) {
      responseBody = JSON.stringify(body.json);
    } else {
      responseBody = typeof body === 'string'
        ? body
        : body && JSON.stringify(body);
    }

    // replace recorded user with fake one
    if (
      responseBody
      && httpRequest.path === '/api/v4/user'
      && httpRequest.headers.Host?.includes('gitlab.com')
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

interface TeardownOptions {
  transformRecordedData?: typeof transformRecordedData;
}

const defaultOptions: TeardownOptions = {
  transformRecordedData,
};

export async function teardownGitLabTest(
  taskData: TaskData,
  { transformRecordedData: transform }: TeardownOptions = defaultOptions,
): Promise<null> {
  if (process.env.RECORD_FIXTURES) {
    await resetRepositories(taskData as RepoData);

    try {
      const filename = getExpectationsFilename(taskData as { spec: string, testName: string });

      console.log('Persisting recorded data for test:', path.basename(filename));

      const { owner, token } = getEnvs();

      const expectations = await retrieveRecordedExpectations();

      const toSanitize: SanitizeOptions = {
        owner,
        repo: taskData.repo!,
        token,
        ownerName: taskData.user?.name,
      };
      // transform the mock proxy recorded requests into Cypress route format
      const toPersist = expectations.map((expectation: RecordedExpectation) =>
        (transform || transformRecordedData)(expectation as unknown as Expectation, toSanitize)
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

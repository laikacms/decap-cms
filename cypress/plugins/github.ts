import { Octokit } from '@octokit/rest';
import fs from 'node:fs/promises';
import path from 'path';
import { merge } from 'lodash-es';

import {
  getExpectationsFilename,
  transformRecordedData as transformData,
  getGitClient,
} from './common';
import { updateConfig } from '../utils/config';
import { escapeRegExp } from '../utils/regexp';
import { retrieveRecordedExpectations, resetMockServerState } from '../utils/mock-server';

import type { RecordedExpectation } from '../utils/mock-server';

const GITHUB_REPO_OWNER_SANITIZED_VALUE = 'owner';
const GITHUB_REPO_NAME_SANITIZED_VALUE = 'repo';
const GITHUB_REPO_TOKEN_SANITIZED_VALUE = 'fakeToken';
const GITHUB_OPEN_AUTHORING_OWNER_SANITIZED_VALUE = 'forkOwner';
const GITHUB_OPEN_AUTHORING_TOKEN_SANITIZED_VALUE = 'fakeForkToken';

interface FakeUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
}

const FAKE_OWNER_USER: FakeUser = {
  login: 'owner',
  id: 1,
  avatar_url: 'https://avatars1.githubusercontent.com/u/7892489?v=4',
  name: 'owner',
};

const FAKE_FORK_OWNER_USER: FakeUser = {
  login: 'forkOwner',
  id: 2,
  avatar_url: 'https://avatars1.githubusercontent.com/u/9919?s=200&v=4',
  name: 'forkOwner',
};

function getGitHubClient(token: string): Octokit {
  const client = new Octokit({
    auth: `token ${token}`,
    baseUrl: 'https://api.github.com',
  });
  return client;
}

interface GitHubEnvs {
  owner: string;
  repo: string;
  token: string;
  forkOwner: string;
  forkToken: string;
}

function getEnvs(): GitHubEnvs {
  const {
    GITHUB_REPO_OWNER: owner,
    GITHUB_REPO_NAME: repo,
    GITHUB_REPO_TOKEN: token,
    GITHUB_OPEN_AUTHORING_OWNER: forkOwner,
    GITHUB_OPEN_AUTHORING_TOKEN: forkToken,
  } = process.env;
  if (!owner || !repo || !token || !forkOwner || !forkToken) {
    throw new Error(
      'Please set GITHUB_REPO_OWNER, GITHUB_REPO_NAME, GITHUB_REPO_TOKEN, GITHUB_OPEN_AUTHORING_OWNER, GITHUB_OPEN_AUTHORING_TOKEN  environment variables',
    );
  }
  return { owner, repo, token, forkOwner, forkToken };
}

interface RepoData {
  owner: string;
  repo: string;
  tempDir: string;
}

async function prepareTestGitHubRepo(): Promise<RepoData> {
  const { owner, repo, token } = getEnvs();

  // postfix a random string to avoid collisions
  const postfix = Math.random()
    .toString(32)
    .slice(2);
  const testRepoName = `${repo}-${Date.now()}-${postfix}`;

  const client = getGitHubClient(token);

  console.log('Creating repository', testRepoName);
  await client.repos.createForAuthenticatedUser({
    name: testRepoName,
  });

  const tempDir = path.join('.temp', testRepoName);
  await fs.rm(tempDir, { recursive: true, force: true });
  let git = getGitClient();

  const repoUrl = `git@github.com:${owner}/${repo}.git`;

  console.log('Cloning repository', repoUrl);
  await git.clone(repoUrl, tempDir);
  git = getGitClient(tempDir);

  console.log('Pushing to new repository', testRepoName);

  await git.removeRemote('origin');
  await git.addRemote(
    'origin',
    `https://${token}:x-oauth-basic@github.com/${owner}/${testRepoName}`,
  );
  await git.push(['-u', 'origin', 'master']);

  return { owner, repo: testRepoName, tempDir };
}

interface AuthenticatedUser {
  login?: string;
  id?: number;
  avatar_url?: string;
  name?: string | null;
  token: string;
  backendName: string;
}

async function getAuthenticatedUser(token: string): Promise<AuthenticatedUser> {
  const client = getGitHubClient(token);
  const { data: user } = await client.users.getAuthenticated();
  return { ...user, token, backendName: 'github' };
}

async function getUser(): Promise<AuthenticatedUser> {
  const { token } = getEnvs();
  return getAuthenticatedUser(token);
}

async function getForkUser(): Promise<AuthenticatedUser> {
  const { forkToken } = getEnvs();
  return getAuthenticatedUser(forkToken);
}

async function deleteRepositories({ owner, repo, tempDir }: RepoData): Promise<void> {
  const { forkOwner, token, forkToken } = getEnvs();

  const errorHandler = (e: { status?: number }) => {
    if (e.status !== 404) {
      throw e;
    }
  };

  console.log('Deleting repository', `${owner}/${repo}`);
  await fs.rm(tempDir, { recursive: true, force: true });

  let client = getGitHubClient(token);
  await client.repos
    .delete({
      owner,
      repo,
    })
    .catch(errorHandler);

  console.log('Deleting forked repository', `${forkOwner}/${repo}`);
  client = getGitHubClient(forkToken);
  await client.repos
    .delete({
      owner: forkOwner,
      repo,
    })
    .catch(errorHandler);
}

async function batchRequests<T>(items: T[], batchSize: number, func: (item: T) => Promise<void>): Promise<void> {
  while (items.length > 0) {
    const batch = items.splice(0, batchSize);
    await Promise.all(batch.map(func));
    await new Promise(resolve => setTimeout(resolve, 2500));
  }
}

async function resetOriginRepo({ owner, repo, tempDir }: RepoData): Promise<void> {
  console.log('Resetting origin repo:', `${owner}/${repo}`);
  const { token } = getEnvs();
  const client = getGitHubClient(token);

  const { data: prs } = await client.pulls.list({
    repo,
    owner,
    state: 'open',
  });
  const numbers = prs.map(pr => pr.number);
  console.log('Closing prs:', numbers);

  await batchRequests(numbers, 10, async pull_number => {
    await client.pulls.update({
      owner,
      repo,
      pull_number,
      state: 'closed',
    });
  });

  const { data: branches } = await client.repos.listBranches({ owner, repo });
  const refs = branches.filter(b => b.name !== 'master').map(b => `heads/${b.name}`);

  console.log('Deleting refs', refs);

  await batchRequests(refs, 10, async ref => {
    await client.git.deleteRef({
      owner,
      repo,
      ref,
    });
  });

  console.log('Resetting master');
  const git = getGitClient(tempDir);
  await git.push(['--force', 'origin', 'master']);
  console.log('Done resetting origin repo:', `${owner}/${repo}`);
}

async function resetForkedRepo({ repo }: { repo: string }): Promise<void> {
  const { forkToken, forkOwner } = getEnvs();
  const client = getGitHubClient(forkToken);

  const { data: repos } = await client.repos.listForAuthenticatedUser();
  if (repos.some(r => r.name === repo)) {
    console.log('Resetting forked repo:', `${forkOwner}/${repo}`);
    const { data: branches } = await client.repos.listBranches({ owner: forkOwner, repo });
    const refs = branches.filter(b => b.name !== 'master').map(b => `heads/${b.name}`);

    console.log('Deleting refs', refs);
    await Promise.all(
      refs.map(ref =>
        client.git.deleteRef({
          owner: forkOwner,
          repo,
          ref,
        }),
      ),
    );
    console.log('Done resetting forked repo:', `${forkOwner}/${repo}`);
  }
}

async function resetRepositories({ owner, repo, tempDir }: RepoData): Promise<void> {
  await resetOriginRepo({ owner, repo, tempDir });
  await resetForkedRepo({ repo });
}

interface BackendOptions {
  backend?: {
    repo?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface SetupResult {
  owner: string;
  repo: string;
  tempDir?: string;
  user: AuthenticatedUser;
  forkUser?: AuthenticatedUser;
  mockResponses: boolean;
}

export async function setupGitHub(options: BackendOptions): Promise<SetupResult> {
  if (process.env.RECORD_FIXTURES) {
    console.log('Running tests in "record" mode - live data with be used!');
    const [user, forkUser, repoData] = await Promise.all([
      getUser(),
      getForkUser(),
      prepareTestGitHubRepo(),
    ]);

    await updateConfig(config => {
      merge(config, options, {
        backend: {
          repo: `${repoData.owner}/${repoData.repo}`,
        },
      });
    });

    return { ...repoData, user, forkUser, mockResponses: false };
  } else {
    console.log('Running tests in "playback" mode - local data with be used');

    await updateConfig(config => {
      merge(config, options, {
        backend: {
          repo: `${GITHUB_REPO_OWNER_SANITIZED_VALUE}/${GITHUB_REPO_NAME_SANITIZED_VALUE}`,
        },
      });
    });

    return {
      owner: GITHUB_REPO_OWNER_SANITIZED_VALUE,
      repo: GITHUB_REPO_NAME_SANITIZED_VALUE,
      user: { ...FAKE_OWNER_USER, token: GITHUB_REPO_TOKEN_SANITIZED_VALUE, backendName: 'github' },
      forkUser: {
        ...FAKE_FORK_OWNER_USER,
        token: GITHUB_OPEN_AUTHORING_TOKEN_SANITIZED_VALUE,
        backendName: 'github',
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
  forkUser?: AuthenticatedUser;
  spec?: string;
  testName?: string;
  [key: string]: unknown;
}

export async function teardownGitHub(taskData: TaskData): Promise<null> {
  if (process.env.RECORD_FIXTURES) {
    await deleteRepositories(taskData as RepoData);
  }

  return null;
}

export async function setupGitHubTest(taskData: TaskData): Promise<null> {
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
  forkOwner: string;
  forkToken: string;
  ownerName?: string;
  forkOwnerName?: string;
}

const sanitizeString = (
  str: string,
  { owner, repo, token, forkOwner, forkToken, ownerName, forkOwnerName }: SanitizeOptions,
): string => {
  let replaced = str
    .replace(new RegExp(escapeRegExp(forkOwner), 'g'), GITHUB_OPEN_AUTHORING_OWNER_SANITIZED_VALUE)
    .replace(new RegExp(escapeRegExp(forkToken), 'g'), GITHUB_OPEN_AUTHORING_TOKEN_SANITIZED_VALUE)
    .replace(new RegExp(escapeRegExp(owner), 'g'), GITHUB_REPO_OWNER_SANITIZED_VALUE)
    .replace(new RegExp(escapeRegExp(repo), 'g'), GITHUB_REPO_NAME_SANITIZED_VALUE)
    .replace(new RegExp(escapeRegExp(token), 'g'), GITHUB_REPO_TOKEN_SANITIZED_VALUE)
    .replace(
      new RegExp('https://avatars\\d+\\.githubusercontent\\.com/u/\\d+?\\?v=\\d', 'g'),
      `${FAKE_OWNER_USER.avatar_url}`,
    );

  if (ownerName) {
    replaced = replaced.replace(new RegExp(escapeRegExp(ownerName), 'g'), FAKE_OWNER_USER.name);
  }

  if (forkOwnerName) {
    replaced = replaced.replace(
      new RegExp(escapeRegExp(forkOwnerName), 'g'),
      FAKE_FORK_OWNER_USER.name,
    );
  }

  return replaced;
};

interface HttpRequest {
  method: string;
  path: string;
  body?: {
    type?: string;
    json?: string | Record<string, unknown>;
    string?: string;
  };
  headers: Record<string, string>;
}

interface HttpResponse {
  statusCode: number;
  headers: Record<string, string[]>;
  body?: {
    type?: string;
    string?: string;
    base64Bytes?: string;
    json?: unknown;
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
      const bodyObject =
        typeof httpRequest.body.json === 'string'
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
      body = httpRequest.body.string;
    } else if (httpRequest.body) {
      const str =
        typeof httpRequest.body !== 'string' ? JSON.stringify(httpRequest.body) : httpRequest.body;
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
      body &&
      typeof body === 'object' &&
      body.type === 'BINARY' &&
      'base64Bytes' in body &&
      body.base64Bytes
    ) {
      responseBody = {
        encoding: 'base64',
        content: body.base64Bytes,
      };
    } else if (body && typeof body === 'object' && 'json' in body && body.json) {
      responseBody = JSON.stringify(body.json);
    } else {
      responseBody =
        typeof body === 'string'
          ? body
          : body && JSON.stringify(body);
    }

    // replace recorded user with fake one
    if (
      responseBody &&
      httpRequest.path === '/user' &&
      httpRequest.headers.Host?.includes('api.github.com')
    ) {
      const parsed = JSON.parse(responseBody as string);
      if (parsed.login === toSanitize.forkOwner) {
        responseBody = JSON.stringify(FAKE_FORK_OWNER_USER);
      } else {
        responseBody = JSON.stringify(FAKE_OWNER_USER);
      }
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

export async function teardownGitHubTest(taskData: TaskData, { transformRecordedData: transform }: TeardownOptions = defaultOptions): Promise<null> {
  if (process.env.RECORD_FIXTURES) {
    await resetRepositories(taskData as RepoData);

    try {
      const filename = getExpectationsFilename(taskData as { spec: string; testName: string });

      console.log('Persisting recorded data for test:', path.basename(filename));

      const { owner, token, forkOwner, forkToken } = getEnvs();

      const expectations = await retrieveRecordedExpectations();

      const toSanitize: SanitizeOptions = {
        owner,
        repo: taskData.repo!,
        token,
        forkOwner,
        forkToken,
        ownerName: taskData.user?.name || undefined,
        forkOwnerName: taskData.forkUser?.name || undefined,
      };
      // transform the mock proxy recorded requests into Cypress route format
      const toPersist = expectations.map((expectation: RecordedExpectation) =>
        (transform || transformRecordedData)(expectation as unknown as Expectation, toSanitize),
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

export async function seedGitHubRepo(taskData: TaskData): Promise<null> {
  if (process.env.RECORD_FIXTURES) {
    const { owner, token } = getEnvs();

    const client = getGitHubClient(token);
    const repo = taskData.repo!;

    try {
      console.log('Getting master branch');
      const { data: master } = await client.repos.getBranch({
        owner,
        repo,
        branch: 'master',
      });

      const prCount = 120;
      const prs = new Array(prCount).fill(0).map((_, i) => i);
      const batchSize = 5;
      await batchRequests(prs, batchSize, async i => {
        const branch = `seed_branch_${i}`;
        console.log(`Creating branch ${branch}`);
        await client.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${branch}`,
          sha: master.commit.sha,
        });

        const filePath = `seed/file_${i}`;
        console.log(`Creating file ${filePath}`);
        await client.repos.createOrUpdateFileContents({
          owner,
          repo,
          branch,
          content: Buffer.from(`Seed File ${i}`).toString('base64'),
          message: `Create seed file ${i}`,
          path: filePath,
        });

        const title = `Non CMS Pull Request ${i}`;
        console.log(`Creating PR ${title}`);
        await client.pulls.create({
          owner,
          repo,
          base: 'master',
          head: branch,
          title,
        });
      });
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  return null;
}

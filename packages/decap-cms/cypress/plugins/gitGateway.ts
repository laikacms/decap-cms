import fetch from 'node-fetch';

import { getGitClient } from './common';
import {
  setupGitHub,
  setupGitHubTest,
  teardownGitHub,
  teardownGitHubTest,
  transformRecordedData as transformGitHub,
} from './github';
import {
  setupGitLab,
  setupGitLabTest,
  teardownGitLab,
  teardownGitLabTest,
  transformRecordedData as transformGitLab,
} from './gitlab';

interface GitGatewayEnvs {
  netlifyApiToken: string;
  githubToken?: string;
  gitlabToken?: string;
  installationId?: string;
}

function getEnvs(): GitGatewayEnvs {
  const {
    NETLIFY_API_TOKEN: netlifyApiToken,
    GITHUB_REPO_TOKEN: githubToken,
    GITLAB_REPO_TOKEN: gitlabToken,
    NETLIFY_INSTALLATION_ID: installationId,
  } = process.env;
  if (!netlifyApiToken) {
    throw new Error(
      'Please set NETLIFY_API_TOKEN, GITHUB_REPO_TOKEN, GITLAB_REPO_TOKEN, NETLIFY_INSTALLATION_ID  environment variables',
    );
  }
  return { netlifyApiToken, githubToken, gitlabToken, installationId };
}

const apiRoot = 'https://api.netlify.com/api/v1/';

async function fetchWithTimeout(
  netlifyApiToken: string,
  path: string,
  method = 'GET',
  payload: unknown = null,
  parseAs: 'json' | 'text' = 'json',
): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const options: RequestInit & { body?: string } = {
      signal: controller.signal as any,
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${netlifyApiToken}`,
      },
    };

    if (payload) {
      options.body = JSON.stringify(payload);
    }

    // Handle both full URLs and API paths
    const url = path.startsWith('http://') || path.startsWith('https://') ? path : `${apiRoot}${path}`;
    const response = await fetch(url, options as any);
    clearTimeout(timeout);

    return parseAs === 'json' ? response.json() : response.text();
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      console.error(`Netlify API ${method} timeout after 10s: ${path}`);
      throw new Error(`Netlify API ${method} request timeout: ${path}`, { cause: error });
    }
    throw error;
  }
}

interface Deploy {
  state: string;
}

async function waitForDeploys(netlifyApiToken: string, siteId: string): Promise<void> {
  const maxRetries = 5;
  const retryDelayMs = 15 * 1000; // 15 seconds between retries

  for (let i = 0; i < maxRetries; i++) {
    try {
      const deploys: Deploy[] = await fetchWithTimeout(netlifyApiToken, `sites/${siteId}/deploys`);

      if (deploys && deploys.some(deploy => deploy.state === 'ready')) {
        return;
      }

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    } catch (error: any) {
      console.error(`Error checking deploy status: ${error.message}`);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  throw new Error(`Timed out waiting for deploy of site ${siteId} after ${maxRetries * retryDelayMs / 1000}s`);
}

const netlifySiteURL = 'https://fake-site-url.netlify.com/';
const email = 'decap@p-m.si';
const password = '12345678';
const backendName = 'git-gateway';

interface SetupResult {
  owner: string;
  repo: string;
  tempDir?: string;
  user: any;
  forkUser?: any;
  mockResponses: boolean;
}

interface ProviderMethods {
  setup: (options: any) => Promise<SetupResult>;
  teardown: (taskData: any) => Promise<null>;
  setupTest: (taskData: any) => Promise<null>;
  teardownTest: (taskData: any, options?: any) => Promise<null>;
  transformData: (expectation: any, toSanitize: any) => any;
  createSite: (netlifyApiToken: string, result: SetupResult) => Promise<{ site_id: string, ssl_url: string }>;
  token: () => string | undefined;
}

const methods: Record<string, ProviderMethods> = {
  github: {
    setup: setupGitHub,
    teardown: teardownGitHub,
    setupTest: setupGitHubTest,
    teardownTest: teardownGitHubTest,
    transformData: transformGitHub,
    createSite: (netlifyApiToken: string, result: SetupResult) => {
      const { installationId } = getEnvs();
      // Create a new Netlify site connected to GitHub repository
      return fetchWithTimeout(netlifyApiToken, 'sites', 'POST', {
        repo: {
          provider: 'github',
          installation_id: installationId,
          repo: `${result.owner}/${result.repo}`,
        },
      });
    },
    token: () => getEnvs().githubToken,
  },
  gitlab: {
    setup: setupGitLab,
    teardown: teardownGitLab,
    setupTest: setupGitLabTest,
    teardownTest: teardownGitLabTest,
    transformData: transformGitLab,
    createSite: async (netlifyApiToken: string, result: SetupResult) => {
      // Generate a deploy key for GitLab
      const { id, public_key } = await fetchWithTimeout(netlifyApiToken, 'deploy_keys', 'POST');
      const { gitlabToken } = getEnvs();
      const project = `${result.owner}/${result.repo}`;
      await fetch(`https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}/deploy_keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gitlabToken}`,
        },
        body: JSON.stringify({ title: 'Netlify Deploy Key', key: public_key, can_push: false }),
      }).then(res => res.json());

      // Create a new Netlify site connected to GitLab repository
      const site = await fetchWithTimeout(netlifyApiToken, 'sites', 'POST', {
        account_slug: result.owner,
        repo: {
          provider: 'gitlab',
          repo: `${result.owner}/${result.repo}`,
          deploy_key_id: id,
        },
      });

      await fetch(`https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}/hooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gitlabToken}`,
        },
        body: JSON.stringify({
          url: 'https://api.netlify.com/hooks/gitlab',
          push_events: true,
          merge_requests_events: true,
          enable_ssl_verification: true,
        }),
      }).then(res => res.json());

      return site;
    },
    token: () => getEnvs().gitlabToken,
  },
};

interface GitGatewayOptions {
  provider: 'github' | 'gitlab';
  [key: string]: unknown;
}

interface GitGatewaySetupResult extends SetupResult {
  site_id?: string;
  ssl_url?: string;
  provider: string;
}

export async function setupGitGateway(options: GitGatewayOptions): Promise<GitGatewaySetupResult> {
  const { provider, ...rest } = options;
  const result = await methods[provider].setup(rest);

  if (process.env.RECORD_FIXTURES) {
    const { netlifyApiToken } = getEnvs();

    console.log(`Creating Netlify Site for provider: ${provider}`);
    let site_id: string, ssl_url: string;
    try {
      ({ site_id, ssl_url } = await methods[provider].createSite(netlifyApiToken, result));
    } catch (e) {
      console.log(e);
      throw e;
    }

    console.log('Enabling identity for site:', site_id);
    // Enable Netlify Identity
    await fetchWithTimeout(netlifyApiToken, `sites/${site_id}/identity`, 'POST', {});

    console.log('Enabling git gateway for site:', site_id);
    const token = methods[provider].token();
    // Enable Git Gateway
    await fetchWithTimeout(netlifyApiToken, `sites/${site_id}/services/git/instances`, 'POST', {
      [provider]: {
        repo: `${result.owner}/${result.repo}`,
        access_token: token,
      },
    });

    console.log('Enabling large media for site:', site_id);
    // Enable Large Media
    await fetchWithTimeout(netlifyApiToken, `sites/${site_id}/services/large-media/instances`, 'POST', {});

    const git = getGitClient(result.tempDir);
    await git.raw([
      'config',
      '-f',
      '.lfsconfig',
      'lfs.url',
      `https://${site_id}.netlify.com/.netlify/large-media`,
    ]);
    await git.addConfig('commit.gpgsign', 'false');
    await git.add('.lfsconfig');
    await git.commit('add .lfsconfig');
    await git.push('origin', 'master');

    await waitForDeploys(netlifyApiToken, site_id);
    console.log('Creating user for site:', site_id, 'with email:', email);

    try {
      // Create a user account via Netlify Identity
      await fetchWithTimeout(
        netlifyApiToken,
        `${ssl_url}/.netlify/functions/create-user`,
        'POST',
        { email, password },
        'text',
      );
      console.log('User created successfully');
    } catch (e) {
      console.log(e);
    }

    return {
      ...result,
      user: {
        ...result.user,
        backendName,
        netlifySiteURL: ssl_url,
        email,
        password,
      },
      site_id,
      ssl_url,
      provider,
    };
  } else {
    console.log('Running tests in "playback" mode - local data will be used');
    return {
      ...result,
      user: {
        ...result.user,
        backendName,
        netlifySiteURL,
        email,
        password,
      },
      provider,
      mockResponses: true,
    };
  }
}

interface TaskData {
  provider: 'github' | 'gitlab';
  site_id?: string;
  [key: string]: unknown;
}

export async function teardownGitGateway(taskData: TaskData): Promise<null> {
  if (process.env.RECORD_FIXTURES) {
    const { netlifyApiToken } = getEnvs();
    const { site_id } = taskData;
    console.log('Deleting Netlify site:', site_id);
    await fetchWithTimeout(netlifyApiToken, `sites/${site_id}`, 'DELETE', null, 'text');

    const result = await methods[taskData.provider].teardown(taskData);
    return result;
  }

  return null;
}

export async function setupGitGatewayTest(taskData: TaskData): Promise<null> {
  if (process.env.RECORD_FIXTURES) {
    const result = await methods[taskData.provider].setupTest(taskData);
    return result;
  }

  return null;
}

export async function teardownGitGatewayTest(taskData: TaskData): Promise<null> {
  if (process.env.RECORD_FIXTURES) {
    const options = {
      transformRecordedData: (expectation: any, toSanitize: any) => {
        const result = methods[taskData.provider].transformData(expectation, toSanitize);

        if (result.response && result.url === '/.netlify/identity/token') {
          const parsed = JSON.parse(result.response);
          parsed.access_token = 'access_token';
          parsed.refresh_token = 'refresh_token';
          return { ...result, response: JSON.stringify(parsed) };
        } else {
          return result;
        }
      },
    };
    const result = await methods[taskData.provider].teardownTest(taskData, options);
    return result;
  }

  return null;
}

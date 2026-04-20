import fs from 'fs-extra';
import path from 'path';
import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { merge } from 'lodash';

import { updateConfig } from '../utils/config';
import { getGitClient } from './common';

const initRepo = async (dir: string): Promise<void> => {
  await fs.remove(dir);
  await fs.mkdirp(dir);
  const git = getGitClient(dir);
  await git.init({ '--initial-branch': 'main' });
  await git.addConfig('user.email', 'cms-cypress-test@netlify.com');
  await git.addConfig('user.name', 'cms-cypress-test');

  const readme = 'README.md';
  await fs.writeFile(path.join(dir, readme), '');
  await git.add(readme);
  await git.commit('initial commit', [readme], { '--no-verify': null, '--no-gpg-sign': null });
};

const startServer = async (repoDir: string, mode: string): Promise<ChildProcess> => {
  const tsNode = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'ts-node');
  const serverDir = path.join(__dirname, '..', '..', 'packages', 'decap-server');
  const distIndex = path.join(serverDir, 'dist', 'index.js');
  const tsIndex = path.join(serverDir, 'src', 'index.ts');

  const port = 8082;
  const env = {
    ...process.env,
    GIT_REPO_DIRECTORY: path.resolve(repoDir),
    PORT: String(port),
    MODE: mode,
  };

  console.log(`Starting proxy server on port '${port}' with mode ${mode}`);
  let childProcess: ChildProcess;
  if (await fs.pathExists(distIndex)) {
    childProcess = spawn('node', [distIndex], { env, cwd: serverDir });
  } else {
    childProcess = spawn(tsNode, ['--files', tsIndex], { env, cwd: serverDir });
  }

  serverProcess = childProcess;

  return new Promise((resolve, reject) => {
    childProcess.stdout?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      console.log(`server:stdout: ${message}`);
      if (message.includes('Decap CMS Proxy Server listening on port')) {
        resolve(childProcess);
      }
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      console.error(`server:stderr: ${data.toString().trim()}`);
      reject(data.toString());
    });
  });
};

let serverProcess: ChildProcess | null = null;

interface ProxyOptions {
  mode?: string;
  [key: string]: unknown;
}

interface ProxyTaskData {
  tempDir: string;
  mode?: string;
}

export async function setupProxy(options: ProxyOptions): Promise<ProxyTaskData> {
  const postfix = Math.random()
    .toString(32)
    .slice(2);

  const testRepoName = `proxy-test-repo-${Date.now()}-${postfix}`;
  const tempDir = path.join('.temp', testRepoName);

  const { mode, ...rest } = options;

  await updateConfig(config => {
    merge(config, rest);
  });

  return { tempDir, mode };
}

export async function teardownProxy(taskData: ProxyTaskData): Promise<null> {
  if (serverProcess) {
    serverProcess.kill();
  }
  await fs.remove(taskData.tempDir);

  return null;
}

export async function setupProxyTest(taskData: ProxyTaskData): Promise<null> {
  await initRepo(taskData.tempDir);
  serverProcess = await startServer(taskData.tempDir, taskData.mode || 'git');
  return null;
}

export async function teardownProxyTest(taskData: ProxyTaskData): Promise<null> {
  if (serverProcess) {
    serverProcess.kill();
  }
  await fs.remove(taskData.tempDir);
  return null;
}

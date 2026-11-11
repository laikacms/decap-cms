import fs from 'node:fs';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runDev } from '../dev';

import type http from 'node:http';
import type { AddressInfo } from 'node:net';

const originalEnv = { ...process.env };
let server: http.Server | undefined;

beforeEach(() => {
  // Vitest sets MODE to its own mode name; the dev server reads MODE too.
  delete process.env.MODE;
  delete process.env.LOG_LEVEL;
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(async () => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  if (server) await new Promise(resolve => server!.close(resolve));
  server = undefined;
});

function tempRepo(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'decap-dev-'));
}

async function info(port: number, headers: Record<string, string> = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api/v1`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ action: 'info' }),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe('decap dev', () => {
  it('runs the decap-cms dev server with the flags, over the environment', async () => {
    const dir = tempRepo();
    process.env.GIT_REPO_DIRECTORY = os.tmpdir();
    process.env.MODE = 'git';
    server = await runDev({ port: '0', host: '127.0.0.1', mode: 'fs', dir });
    const { port } = server.address() as AddressInfo;

    expect(await info(port)).toEqual({
      status: 200,
      body: { repo: path.basename(dir), publish_modes: ['simple'], type: 'local_fs' },
    });
  });

  it('passes --origin through to the CORS check', async () => {
    server = await runDev({ port: '0', host: '127.0.0.1', dir: tempRepo(), origin: 'https://cms.example' });
    const { port } = server.address() as AddressInfo;

    expect((await info(port, { origin: 'https://cms.example' })).status).toBe(200);
    expect((await info(port, { origin: 'http://localhost:1313' })).status).toBe(403);
  });

  it('logs at info by default and honours --log-level', async () => {
    const infoLog = vi.mocked(console.info);
    server = await runDev({ port: '0', host: '127.0.0.1', dir: tempRepo() });
    expect(infoLog).toHaveBeenCalledWith(expect.stringContaining('Decap CMS Proxy Server listening on 127.0.0.1'));
    await new Promise(resolve => server!.close(resolve));

    infoLog.mockClear();
    server = await runDev({ port: '0', host: '127.0.0.1', dir: tempRepo(), logLevel: 'error' });
    expect(infoLog).not.toHaveBeenCalled();
  });

  it('refuses a --port that is not a number', async () => {
    await expect(runDev({ port: '80a' })).rejects.toThrow('--port must be a number.');
  });

  it('refuses an unknown --mode', async () => {
    await expect(runDev({ port: '0', mode: 'svn' })).rejects.toThrow("Unknown proxy mode 'svn'");
  });

  it('names the flag to change when the port is taken', async () => {
    const blocker = createServer();
    await new Promise<void>((resolve, reject) => {
      blocker.once('error', reject);
      blocker.listen(0, '127.0.0.1', () => resolve());
    });
    const { port } = blocker.address() as AddressInfo;

    try {
      await expect(runDev({ port: String(port), host: '127.0.0.1', dir: tempRepo() })).rejects.toThrow(
        `Port ${port} is already in use; pass --port <other>`,
      );
    } finally {
      await new Promise<void>(resolve => blocker.close(() => resolve()));
    }
  });
});

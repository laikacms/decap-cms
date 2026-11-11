// @vitest-environment node
import fs from 'node:fs';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLogger, runDevServer } from './run';

import type http from 'node:http';
import type { AddressInfo } from 'node:net';

const noop = () => {};
const logger = { log: noop, info: vi.fn(), error: noop, warn: noop, debug: noop };

const originalEnv = { ...process.env };
let server: http.Server | undefined;

beforeEach(() => {
  // Vitest sets MODE to its own mode name.
  delete process.env.MODE;
});

afterEach(async () => {
  process.env = { ...originalEnv };
  if (server) await new Promise(resolve => server!.close(resolve));
  server = undefined;
  vi.clearAllMocks();
});

async function post(port: number, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api/v1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

describe('runDevServer', () => {
  it('serves the directory given as an option, over the environment', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'decap-run-'));
    process.env.GIT_REPO_DIRECTORY = os.tmpdir();
    process.env.MODE = 'git';
    server = await runDevServer({ port: 0, host: '127.0.0.1', mode: 'fs', dir, logger });
    const { port } = server.address() as AddressInfo;

    expect(await post(port, { action: 'info' })).toEqual({
      status: 200,
      body: { repo: path.basename(dir), publish_modes: ['simple'], type: 'local_fs' },
    });
  });

  it('allows the origin given as an option', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'decap-run-'));
    server = await runDevServer({ port: 0, host: '127.0.0.1', dir, origin: 'https://cms.example', logger });
    const { port } = server.address() as AddressInfo;

    expect((await post(port, { action: 'info' }, { Origin: 'https://cms.example' })).status).toBe(200);
    expect((await post(port, { action: 'info' }, { Origin: 'http://localhost:3000' })).status).toBe(403);
  });

  it('falls back to the environment variables', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'decap-run-'));
    process.env.PORT = '0';
    process.env.BIND_HOST = '127.0.0.1';
    process.env.GIT_REPO_DIRECTORY = dir;
    server = await runDevServer({ logger });
    const { port } = server.address() as AddressInfo;

    expect((await post(port, { action: 'info' })).body.repo).toBe(path.basename(dir));
  });

  it('reports the port it was given when asked for any free one', async () => {
    server = await runDevServer({ port: 0, dir: os.tmpdir(), logger });
    const { port } = server.address() as AddressInfo;

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`listening on port ${port} (this machine only`));
  });

  it('rejects with one line instead of a stack trace when the port is taken', async () => {
    const blocker = createServer();
    await new Promise<void>((resolve, reject) => {
      blocker.once('error', reject);
      blocker.listen(0, '127.0.0.1', () => resolve());
    });
    const { port } = blocker.address() as AddressInfo;

    try {
      await expect(runDevServer({ port, host: '127.0.0.1', dir: os.tmpdir(), logger })).rejects.toMatchObject({
        message: `Port ${port} is already in use`,
        code: 'EADDRINUSE',
      });
    } finally {
      await new Promise<void>(resolve => blocker.close(() => resolve()));
    }
  });

  it('rejects an unknown mode and an invalid port instead of exiting', async () => {
    await expect(runDevServer({ mode: 'svn', logger })).rejects.toThrow("Unknown proxy mode 'svn'");
    await expect(runDevServer({ port: 70000, logger })).rejects.toThrow("Invalid port '70000'");
  });
});

describe('createLogger', () => {
  it('drops lines below the level', () => {
    const target = { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
    const filtered = createLogger('warn', target);
    filtered.error('e');
    filtered.warn('w');
    filtered.info('i');
    filtered.log('l');
    filtered.debug('d');

    expect(target.error).toHaveBeenCalledWith('e');
    expect(target.warn).toHaveBeenCalledWith('w');
    expect(target.info).not.toHaveBeenCalled();
    expect(target.log).not.toHaveBeenCalled();
    expect(target.debug).not.toHaveBeenCalled();
  });

  it('logs request lines at debug', () => {
    const target = { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
    createLogger('debug', target).debug('POST /api/v1 200');

    expect(target.debug).toHaveBeenCalledWith('POST /api/v1 200');
  });

  it('refuses an unknown level', () => {
    expect(() => createLogger('loud')).toThrow("Unknown log level 'loud'");
  });
});

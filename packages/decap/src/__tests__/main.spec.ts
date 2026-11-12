import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { main, run } from '../main';

const originalEnv = { ...process.env };
let log: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.XDG_CONFIG_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'decap-main-'));
  delete process.env.DECAP_TOKEN;
  delete process.env.DECAP_API_URL;
  log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  process.env = { ...originalEnv };
  process.exitCode = undefined;
  vi.restoreAllMocks();
});

describe('main', () => {
  it('prints the version', async () => {
    expect(await main(['--version'])).toBe(0);
    expect(log).toHaveBeenCalledWith('0.0.0-dev');
  });

  it('prints the help, and fails without a command', async () => {
    expect(await main(['--help'])).toBe(0);
    expect(String(log.mock.calls[0]![0])).toContain('decap dev');
    expect(await main([])).toBe(1);
  });

  it('prints a Turbo command help from the contract', async () => {
    expect(await main(['sites', 'list', '--help'])).toBe(0);
    expect(String(log.mock.calls[0]![0])).toMatch(/^decap sites list\n/);
  });

  it('rejects a mistyped flag on a built-in command', async () => {
    await expect(main(['dev', '--prot', '8082'])).rejects.toThrow('Unknown flag --prot for "decap dev"');
  });

  it('rejects an unknown command', async () => {
    expect(await main(['nope'])).toBe(1);
    expect(error).toHaveBeenCalledWith('Unknown command "nope". Run decap --help.');
  });

  it('asks to sign in before calling the API without a token', async () => {
    await expect(main(['orgs', 'list', '--api-url', 'http://127.0.0.1:9'])).rejects.toThrow('Not signed in.');
  });
});

describe('run', () => {
  it('turns a failure into one line and exit code 1', async () => {
    process.env.DECAP_TOKEN = 'dcp_' + 'a'.repeat(43);
    // Port 9 (discard) is closed on a test machine: the request is refused.
    await run(['orgs', 'list', '--api-url', 'http://127.0.0.1:9']);

    expect(process.exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/^✗ Could not reach http:\/\/127\.0\.0\.1:9: /));
  });
});

// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const runDevServer = vi.fn(() => Promise.resolve());
vi.mock('./run', () => ({ runDevServer, createLogger: vi.fn() }));
vi.mock('dotenv/config', () => ({}));

const FLAG = Symbol.for('decap-cms.dev-server.embedded');

afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[FLAG];
  vi.resetModules();
  runDevServer.mockClear();
});

describe('dev-server entry', () => {
  it('starts the server from the environment when imported', async () => {
    await import('.');

    expect(runDevServer).toHaveBeenCalledWith();
  });

  it('leaves starting it to an embedding caller that set the flag', async () => {
    (globalThis as Record<symbol, unknown>)[FLAG] = true;
    const entry = await import('.');

    expect(runDevServer).not.toHaveBeenCalled();
    expect(entry.EMBEDDED_FLAG).toBe(FLAG);
    expect(entry.runDevServer).toBe(runDevServer);
  });
});

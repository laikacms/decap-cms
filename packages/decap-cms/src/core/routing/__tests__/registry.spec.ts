import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultRoutingTable } from '@/core/routing/router';

import type { Router } from '@/core/routing/router';

const router: Router = {
  location: () => ({ pathname: '/', search: '' }),
  push: vi.fn(),
  replace: vi.fn(),
  href: (path: string) => `#${path}`,
  subscribe: vi.fn(() => () => {}),
  block: vi.fn(() => () => {}),
};

// `registry` keeps its `active` pair in module-level state, so each case
// resets the module registry and re-imports it fresh to avoid leaking the
// singleton between tests.
async function importRegistry() {
  return import('@/core/routing/registry');
}

describe('registry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns the stored pair after setActiveRouting', async () => {
    const { setActiveRouting, getActiveRouting } = await importRegistry();

    setActiveRouting({ router, routing: defaultRoutingTable });

    expect(getActiveRouting()).toEqual({ router, routing: defaultRoutingTable });
  });

  it('throws when no active router has been registered', async () => {
    const { getActiveRouting } = await importRegistry();

    expect(() => getActiveRouting()).toThrow(
      'No active router registered. Imperative navigation requires a mounted DecapCmsProvider.',
    );
  });
});

import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LlmTransportProvider, useLlmTransport } from '@/core/lib/llm';
import { getLlmTransport, registerLlmTransport, unregisterLlmTransport } from '@/core/lib/registry';

import type { LlmSession, LlmTransport } from '@/lib/util/index';

/**
 * Resolution order for the LLM seam. Same rule as `CmsSlots`: an app that
 * passes a transport must win over one a dependency installed behind its back.
 */

function makeTransport(label: string): LlmTransport {
  return {
    openSession: () => ({ label } as unknown as LlmSession),
  };
}

function TransportProbe({ onResolve }: { onResolve: (transport: LlmTransport | undefined) => void }) {
  onResolve(useLlmTransport());
  return null;
}

function resolve(node: React.ReactElement) {
  let captured: LlmTransport | undefined;
  render(
    React.cloneElement(node, {}, <TransportProbe onResolve={value => (captured = value)} />),
  );
  return captured;
}

describe('useLlmTransport', () => {
  afterEach(() => {
    unregisterLlmTransport();
  });

  it('is undefined when nothing supplies a transport', () => {
    expect(resolve(<LlmTransportProvider />)).toBeUndefined();
  });

  it('resolves a transport passed as a prop', () => {
    const transport = makeTransport('prop');

    expect(resolve(<LlmTransportProvider llm={transport} />)).toBe(transport);
  });

  it('resolves a registered transport when no prop is supplied', () => {
    const transport = makeTransport('registered');
    registerLlmTransport(transport);

    expect(resolve(<LlmTransportProvider />)).toBe(transport);
  });

  it('prefers the prop over a registered transport', () => {
    const registered = makeTransport('registered');
    const passed = makeTransport('prop');
    registerLlmTransport(registered);

    // The deployment has the final say over what a dependency installed.
    expect(resolve(<LlmTransportProvider llm={passed} />)).toBe(passed);
  });

  it('resolves a registered transport with no provider in the tree at all', () => {
    const transport = makeTransport('registered');
    registerLlmTransport(transport);

    let captured: LlmTransport | undefined;
    render(<TransportProbe onResolve={value => (captured = value)} />);

    expect(captured).toBe(transport);
  });
});

describe('registerLlmTransport', () => {
  afterEach(() => {
    unregisterLlmTransport();
  });

  it('rejects anything that cannot open a session', () => {
    expect(() => registerLlmTransport({} as LlmTransport)).toThrow(/LLM transport invalid/);
    expect(() => registerLlmTransport(undefined as never)).toThrow(/LLM transport invalid/);
  });

  it('warns and keeps the last transport when registered twice', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = makeTransport('first');
    const second = makeTransport('second');

    registerLlmTransport(first);
    registerLlmTransport(second);

    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('An LLM transport was already registered'),
    );
    expect(getLlmTransport()).toBe(second);

    consoleWarn.mockRestore();
  });

  it('unregisters back to nothing', () => {
    registerLlmTransport(makeTransport('one'));
    unregisterLlmTransport();

    expect(getLlmTransport()).toBeUndefined();
  });
});

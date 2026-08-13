import { renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore } from 'redux';
import { describe, expect, it } from 'vitest';

import { useConfig } from '@/core/hooks/useConfig';

type ConfigState = {
  isFetching?: boolean,
  error?: string,
  publish_mode?: string,
  display_url?: string,
  logo_url?: string,
  logo?: string,
  backend?: { name?: string },
};

type RootState = { config: ConfigState | undefined };

// `config` may legitimately be `undefined` (before `loadConfig` resolves), so
// this store is built directly with `legacy_createStore` + a preloaded state
// rather than `combineReducers` — `combineReducers`'s reducer-shape assertion
// dispatches a probe action with `state=undefined` and rejects any slice that
// can return `undefined`.
function buildStore(config: ConfigState | undefined) {
  const reducer = (state: RootState = { config }) => state;
  return createStore(reducer, { config });
}

function setup(config: ConfigState | undefined) {
  const store = buildStore(config);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return renderHook(() => useConfig(), { wrapper });
}

describe('useConfig', () => {
  it('derives hasWorkflow/isSimpleWorkflow true for editorial_workflow publish mode', () => {
    const { result } = setup({ isFetching: false, publish_mode: 'editorial_workflow' });

    expect(result.current.publishMode).toBe('editorial_workflow');
    expect(result.current.hasWorkflow).toBe(true);
    expect(result.current.isSimpleWorkflow).toBe(false);
  });

  it('derives hasWorkflow/isSimpleWorkflow true for simple publish mode', () => {
    const { result } = setup({ isFetching: false, publish_mode: 'simple' });

    expect(result.current.publishMode).toBe('simple');
    expect(result.current.hasWorkflow).toBe(false);
    expect(result.current.isSimpleWorkflow).toBe(true);
  });

  it('derives hasWorkflow/isSimpleWorkflow both false when publish_mode is unset', () => {
    const { result } = setup({ isFetching: false });

    expect(result.current.publishMode).toBeUndefined();
    expect(result.current.hasWorkflow).toBe(false);
    expect(result.current.isSimpleWorkflow).toBe(false);
  });

  it('isLoading defaults to true when config is absent', () => {
    const { result } = setup(undefined);

    expect(result.current.config).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('isLoading reflects config.isFetching when config is present', () => {
    const { result } = setup({ isFetching: false });

    expect(result.current.isLoading).toBe(false);
  });

  it('isTestRepo is true only for backend.name === "test-repo"', () => {
    const { result: testRepo } = setup({ isFetching: false, backend: { name: 'test-repo' } });
    expect(testRepo.current.isTestRepo).toBe(true);

    const { result: github } = setup({ isFetching: false, backend: { name: 'github' } });
    expect(github.current.isTestRepo).toBe(false);

    const { result: noBackend } = setup({ isFetching: false });
    expect(noBackend.current.isTestRepo).toBe(false);
  });

  it('surfaces hasError/error from config.error', () => {
    const { result } = setup({ isFetching: false, error: 'boom' });

    expect(result.current.hasError).toBe(true);
    expect(result.current.error).toBe('boom');
  });
});

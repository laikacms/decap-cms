import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '@/lib/util/API.js';
import { PreviewState } from '@/lib/util/API.js';
import { APIError } from '@/lib/util/errors/APIError.js';

describe('Api', () => {
  describe('getPreviewStatus', () => {
    it('should return preview status on matching context', () => {
      const status = {
        context: 'deploy',
        target_url: 'https://example.com',
        state: PreviewState.Success,
      };
      expect(api.getPreviewStatus([status], '')).toEqual(status);
    });

    it('should return undefined on non-matching context', () => {
      const status = {
        context: 'other',
        target_url: 'https://example.com',
        state: PreviewState.Other,
      };
      expect(api.getPreviewStatus([status], '')).toBeUndefined();
    });
  });

  describe('parseResponse', () => {
    const makeResponse = (body: string, ok: boolean, contentType?: string) =>
      new Response(body, {
        status: ok ? 200 : 400,
        headers: contentType ? { 'Content-Type': contentType } : {},
      });

    it('should parse JSON content', async () => {
      const response = makeResponse('{"a":1}', true, 'application/json; charset=utf-8');
      await expect(api.parseResponse(response)).resolves.toEqual({ a: 1 });
    });

    it('should reject with parsed JSON on JSON error responses', async () => {
      const response = makeResponse('{"message":"nope"}', false, 'application/json');
      await expect(api.parseResponse(response)).rejects.toEqual({ message: 'nope' });
    });

    it('should return text for non-JSON ok responses', async () => {
      const response = makeResponse('hello', true, 'text/plain');
      await expect(api.parseResponse(response)).resolves.toBe('hello');
    });

    it('should reject with text for non-JSON error responses', async () => {
      const response = makeResponse('bad request', false, 'text/plain');
      await expect(api.parseResponse(response)).rejects.toBe('bad request');
    });
  });

  describe('isPreviewContext', () => {
    it('should match exact previewContext when given', () => {
      expect(api.isPreviewContext('ci/preview', 'ci/preview')).toBe(true);
      expect(api.isPreviewContext('ci/deploy', 'ci/preview')).toBe(false);
    });

    it('should fall back to the deploy keyword without previewContext', () => {
      expect(api.isPreviewContext('netlify/deploy-preview', '')).toBe(true);
      expect(api.isPreviewContext('ci/tests', '')).toBe(false);
    });
  });

  describe('throwOnConflictingBranches', () => {
    it('should throw an APIError naming the conflicting branch', async () => {
      const getBranch = vi.fn((name: string) =>
        name === 'cms/posts' ? Promise.resolve({ name }) : Promise.reject(new Error('404'))
      );
      const error = await api
        .throwOnConflictingBranches('cms/posts/post-1', getBranch, 'GitHub')
        .catch(e => e);
      expect(error).toBeInstanceOf(APIError);
      expect(error.message).toContain("already a branch named 'cms/posts'");
      expect(getBranch).toHaveBeenCalledWith('cms');
      expect(getBranch).toHaveBeenCalledWith('cms/posts');
    });

    it('should pass when no parent branch exists', async () => {
      const getBranch = vi.fn(() => Promise.reject(new Error('404')));
      await expect(api.throwOnConflictingBranches('cms/posts/post-1', getBranch, 'GitHub'))
        .resolves.toBeUndefined();
    });

    it('should not query anything for a branch without a slash', async () => {
      const getBranch = vi.fn();
      await api.throwOnConflictingBranches('main', getBranch, 'GitHub');
      expect(getBranch).not.toHaveBeenCalled();
    });
  });

  describe('requestWithBackoff', () => {
    type TestApi = Parameters<typeof api.requestWithBackoff>[0];
    const makeApi = (requestFunction: TestApi['requestFunction']): TestApi => ({
      buildRequest: req => req,
      requestFunction,
    });

    beforeEach(() => {
      vi.useFakeTimers();
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('should pass a successful response through', async () => {
      const response = new Response('ok', { status: 200 });
      const requestFunction = vi.fn().mockResolvedValue(response);
      await expect(api.requestWithBackoff(makeApi(requestFunction), 'http://x')).resolves.toBe(
        response,
      );
      expect(requestFunction).toHaveBeenCalledTimes(1);
    });

    it('should retry after a 429 and then resolve', async () => {
      const ok = new Response('ok', { status: 200 });
      const requestFunction = vi.fn()
        .mockResolvedValueOnce(new Response('slow down', { status: 429 }))
        .mockResolvedValueOnce(ok);
      const testApi = makeApi(requestFunction);
      const promise = api.requestWithBackoff(testApi, 'http://x');
      await vi.advanceTimersByTimeAsync(1000);
      await expect(promise).resolves.toBe(ok);
      expect(requestFunction).toHaveBeenCalledTimes(2);
    });

    it('should raise a rate limit error using X-RateLimit-Reset and retry', async () => {
      const ok = new Response('ok', { status: 200 });
      const limited = new Response(JSON.stringify({ message: 'API rate limit exceeded for x' }), {
        status: 403,
        headers: { 'X-RateLimit-Reset': '10' },
      });
      const requestFunction = vi.fn().mockResolvedValueOnce(limited).mockResolvedValueOnce(ok);
      const testApi = makeApi(requestFunction);
      const promise = api.requestWithBackoff(testApi, 'http://x');

      await vi.advanceTimersByTimeAsync(9_999);
      expect(testApi.rateLimiter).toBeDefined();
      expect(requestFunction).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      await expect(promise).resolves.toBe(ok);
      expect(requestFunction).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenCalledWith(
        'Pausing requests for 10 second due to fetch failures:',
        'API rate limit exceeded for x',
      );
    });

    it('should fall back to a pause derived from now+60s when X-RateLimit-Reset is missing', async () => {
      const ok = new Response('ok', { status: 200 });
      const limited = new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
        status: 403,
      });
      const requestFunction = vi.fn().mockResolvedValueOnce(limited).mockResolvedValueOnce(ok);
      const testApi = makeApi(requestFunction);
      const promise = api.requestWithBackoff(testApi, 'http://x');
      await vi.advanceTimersByTimeAsync(0);
      expect(testApi.rateLimiter).toBeDefined();
      // reset value is an epoch timestamp, so RateLimitError clamps it to one hour
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
      await expect(promise).resolves.toBe(ok);
    });

    it('should return a 403 with another body and keep json() readable', async () => {
      const forbidden = new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
      const requestFunction = vi.fn().mockResolvedValue(forbidden);
      const response = await api.requestWithBackoff(makeApi(requestFunction), 'http://x');
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ message: 'Forbidden' });
      expect(requestFunction).toHaveBeenCalledTimes(1);
    });

    it('should give up and rethrow after more than 5 attempts', async () => {
      const requestFunction = vi.fn().mockImplementation(() =>
        Promise.resolve(new Response('too many', { status: 429 }))
      );
      const promise = api.requestWithBackoff(makeApi(requestFunction), 'http://x');
      const assertion = expect(promise).rejects.toThrow('too many');
      await vi.advanceTimersByTimeAsync(1000 * (1 + 4 + 9 + 16 + 25));
      await assertion;
      expect(requestFunction).toHaveBeenCalledTimes(6);
    });

    it('should rethrow the implicit auth refresh error immediately', async () => {
      const requestFunction = vi.fn().mockRejectedValue(
        new Error("Can't refresh access token when using implicit auth"),
      );
      const testApi = makeApi(requestFunction);
      await expect(api.requestWithBackoff(testApi, 'http://x')).rejects.toThrow(
        "Can't refresh access token when using implicit auth",
      );
      expect(requestFunction).toHaveBeenCalledTimes(1);
      expect(testApi.rateLimiter).toBeUndefined();
    });

    it('should create a single rateLimiter across concurrent failures and clear it after the timeout', async () => {
      const requestFunction = vi.fn()
        .mockResolvedValueOnce(new Response('x', { status: 429 }))
        .mockResolvedValueOnce(new Response('x', { status: 429 }))
        .mockImplementation(() => Promise.resolve(new Response('ok', { status: 200 })));
      const testApi = makeApi(requestFunction);

      const promise = Promise.all([
        api.requestWithBackoff(testApi, 'http://a'),
        api.requestWithBackoff(testApi, 'http://b'),
      ]);
      await vi.advanceTimersByTimeAsync(0);
      const limiter = testApi.rateLimiter;
      expect(limiter).toBeDefined();

      await vi.advanceTimersByTimeAsync(999);
      expect(testApi.rateLimiter).toBe(limiter);

      await vi.advanceTimersByTimeAsync(1);
      expect(testApi.rateLimiter).toBeUndefined();
      // the lock is taken by the first retry; the second waits out acquire()'s 15s timeout
      await vi.advanceTimersByTimeAsync(15_000);
      const responses = await promise;
      expect(responses.map(r => r.status)).toEqual([200, 200]);
      expect(console.log).toHaveBeenCalledWith('Done pausing requests');
      expect(console.log).toHaveBeenCalledTimes(2);
    });
  });
});

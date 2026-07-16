import { describe, expect, it } from 'vitest';

import { API_ERROR, APIError } from '@/lib/util/errors/APIError.js';
import { ACCESS_TOKEN_ERROR, AccessTokenError } from '@/lib/util/errors/AccessTokenError.js';
import { CONFIGURATION_ERROR, ConfigurationError } from '@/lib/util/errors/ConfigurationError.js';
import { LOCAL_SEARCH_ERROR, LocalSearchError } from '@/lib/util/errors/LocalSearchError.js';

describe('APIError', () => {
  it('sets message, name, status, api, and defaults meta to an empty object', () => {
    const error = new APIError('request failed', 500, 'github');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(APIError);
    expect(error.message).toBe('request failed');
    expect(error.name).toBe(API_ERROR);
    expect(error.status).toBe(500);
    expect(error.api).toBe('github');
    expect(error.meta).toEqual({});
  });

  it('preserves a provided meta object', () => {
    const meta = { requestId: 'abc123' };

    const error = new APIError('request failed', 404, 'gitlab', meta);

    expect(error.meta).toBe(meta);
  });

  it('allows a null status', () => {
    const error = new APIError('unknown failure', null, 'bitbucket');

    expect(error.status).toBeNull();
  });
});

describe('AccessTokenError', () => {
  it('sets message and name', () => {
    const error = new AccessTokenError('token expired');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AccessTokenError);
    expect(error.message).toBe('token expired');
    expect(error.name).toBe(ACCESS_TOKEN_ERROR);
  });
});

describe('ConfigurationError', () => {
  it('sets message and name', () => {
    const error = new ConfigurationError('missing backend config');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConfigurationError);
    expect(error.message).toBe('missing backend config');
    expect(error.name).toBe(CONFIGURATION_ERROR);
  });
});

describe('LocalSearchError', () => {
  it('sets message, name, and the wrapped errors array', () => {
    const inner = [new Error('first'), new Error('second')];

    const error = new LocalSearchError('search failed', inner);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(LocalSearchError);
    expect(error.message).toBe('search failed');
    expect(error.name).toBe(LOCAL_SEARCH_ERROR);
    expect(error.errors).toBe(inner);
    expect(error.errors).toHaveLength(2);
  });

  it('accepts an empty errors array', () => {
    const error = new LocalSearchError('no underlying errors', []);

    expect(error.errors).toEqual([]);
  });
});

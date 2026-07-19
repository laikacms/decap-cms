import { describe, expect, it } from 'vitest';

import {
  ExtractAuthorizationApiKey,
  ExtractAuthorizationBearerToken,
} from '@/lib/util/core-utils/http.js';

describe('ExtractAuthorizationBearerToken', () => {
  it('should extract the token from a valid Bearer header', () => {
    expect(ExtractAuthorizationBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('should extract a token containing URL-safe characters and padding', () => {
    expect(ExtractAuthorizationBearerToken('Bearer abc-123_456.789~+/==')).toBe(
      'abc-123_456.789~+/==',
    );
  });

  it('should return undefined when the header is missing', () => {
    expect(ExtractAuthorizationBearerToken(undefined)).toBeUndefined();
  });

  it('should return undefined for null input', () => {
    expect(ExtractAuthorizationBearerToken(null)).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    expect(ExtractAuthorizationBearerToken(undefined)).toBeUndefined();
  });

  it('should return undefined for an empty string', () => {
    expect(ExtractAuthorizationBearerToken('')).toBeUndefined();
  });

  it('should return undefined for a non-Bearer scheme', () => {
    expect(ExtractAuthorizationBearerToken('ApiKey abc123')).toBeUndefined();
    expect(ExtractAuthorizationBearerToken('Basic dXNlcjpwYXNz')).toBeUndefined();
  });

  it('should return undefined for a malformed token', () => {
    expect(ExtractAuthorizationBearerToken('Bearer')).toBeUndefined();
    expect(ExtractAuthorizationBearerToken('Bearer ')).toBeUndefined();
    expect(ExtractAuthorizationBearerToken('Bearer abc 123')).toBeUndefined();
    expect(ExtractAuthorizationBearerToken('Bearer abc$123')).toBeUndefined();
  });

  it('should be case-sensitive on the scheme name', () => {
    expect(ExtractAuthorizationBearerToken('bearer abc123')).toBeUndefined();
  });
});

describe('ExtractAuthorizationApiKey', () => {
  it('should extract the key from a valid ApiKey header', () => {
    expect(ExtractAuthorizationApiKey('ApiKey abc123')).toBe('abc123');
  });

  it('should extract a key containing URL-safe characters and padding', () => {
    expect(ExtractAuthorizationApiKey('ApiKey abc-123_456.789~+/==')).toBe(
      'abc-123_456.789~+/==',
    );
  });

  it('should return undefined when the header is missing', () => {
    expect(ExtractAuthorizationApiKey(undefined)).toBeUndefined();
  });

  it('should return undefined for null input', () => {
    expect(ExtractAuthorizationApiKey(null)).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    expect(ExtractAuthorizationApiKey(undefined)).toBeUndefined();
  });

  it('should return undefined for an empty string', () => {
    expect(ExtractAuthorizationApiKey('')).toBeUndefined();
  });

  it('should return undefined for a non-ApiKey scheme', () => {
    expect(ExtractAuthorizationApiKey('Bearer abc123')).toBeUndefined();
    expect(ExtractAuthorizationApiKey('Basic dXNlcjpwYXNz')).toBeUndefined();
  });

  it('should return undefined for a malformed key', () => {
    expect(ExtractAuthorizationApiKey('ApiKey')).toBeUndefined();
    expect(ExtractAuthorizationApiKey('ApiKey ')).toBeUndefined();
    expect(ExtractAuthorizationApiKey('ApiKey abc 123')).toBeUndefined();
    expect(ExtractAuthorizationApiKey('ApiKey abc$123')).toBeUndefined();
  });

  it('should be case-sensitive on the scheme name', () => {
    expect(ExtractAuthorizationApiKey('apikey abc123')).toBeUndefined();
  });
});

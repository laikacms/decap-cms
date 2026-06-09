import APIError, { API_ERROR } from '../APIError';
import AccessTokenError, { ACCESS_TOKEN_ERROR } from '../AccessTokenError';

describe('APIError', () => {
  it('sets message, status, api, and name', () => {
    const error = new APIError('Not Found', 404, 'GitHub');
    expect(error.message).toBe('Not Found');
    expect(error.status).toBe(404);
    expect(error.api).toBe('GitHub');
    expect(error.name).toBe(API_ERROR);
  });

  it('stores null status correctly', () => {
    const error = new APIError('Network failure', null, 'GitLab');
    expect(error.status).toBeNull();
  });

  it('defaults meta to empty object when not supplied', () => {
    const error = new APIError('Unauthorized', 401, 'Bitbucket');
    expect(error.meta).toEqual({});
  });

  it('stores supplied meta object', () => {
    const meta = { retryAfter: 60, region: 'eu' };
    const error = new APIError('Rate limited', 429, 'GitHub', meta);
    expect(error.meta).toBe(meta);
  });

  it('is an instance of Error', () => {
    const error = new APIError('Server error', 500, 'GitHub');
    expect(error instanceof Error).toBe(true);
  });

  it('has a custom name that is not "Error"', () => {
    const error = new APIError('Server error', 500, 'GitHub');
    expect(error.name).not.toBe('Error');
  });
});

describe('AccessTokenError', () => {
  it('sets message and name', () => {
    const error = new AccessTokenError('Token expired');
    expect(error.message).toBe('Token expired');
    expect(error.name).toBe(ACCESS_TOKEN_ERROR);
  });

  it('is an instance of Error', () => {
    const error = new AccessTokenError('Token missing');
    expect(error instanceof Error).toBe(true);
  });

  it('has a custom name that is not "Error"', () => {
    const error = new AccessTokenError('Token invalid');
    expect(error.name).not.toBe('Error');
  });
});

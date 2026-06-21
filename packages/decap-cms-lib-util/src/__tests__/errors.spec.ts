import APIError, { API_ERROR } from '../APIError';
import AccessTokenError, { ACCESS_TOKEN_ERROR } from '../AccessTokenError';
import EditorialWorkflowError, { EDITORIAL_WORKFLOW_ERROR } from '../EditorialWorkflowError';

describe('APIError', () => {
  it('sets message on the instance', () => {
    const error = new APIError('Not Found', 404, 'GitHub');
    expect(error.message).toBe('Not Found');
  });

  it('sets status on the instance', () => {
    const error = new APIError('Not Found', 404, 'GitHub');
    expect(error.status).toBe(404);
  });

  it('sets api on the instance', () => {
    const error = new APIError('Not Found', 404, 'GitHub');
    expect(error.api).toBe('GitHub');
  });

  it('sets name to API_ERROR constant', () => {
    const error = new APIError('Not Found', 404, 'GitHub');
    expect(error.name).toBe(API_ERROR);
  });

  it('merges custom meta onto the instance', () => {
    const meta = { retryAfter: 30, region: 'us-east-1' };
    const error = new APIError('Rate limited', 429, 'GitHub', meta);
    expect(error.meta).toBe(meta);
  });

  it('defaults meta to empty object when not supplied', () => {
    const error = new APIError('Unauthorized', 401, 'GitLab');
    expect(error.meta).toEqual({});
  });

  it('is an instance of Error', () => {
    const error = new APIError('Server error', 500, 'GitHub');
    expect(error instanceof Error).toBe(true);
  });
});

describe('AccessTokenError', () => {
  it('sets message on the instance', () => {
    const error = new AccessTokenError('Token expired');
    expect(error.message).toBe('Token expired');
  });

  it('sets name to ACCESS_TOKEN_ERROR constant', () => {
    const error = new AccessTokenError('Token expired');
    expect(error.name).toBe(ACCESS_TOKEN_ERROR);
  });

  it('is an instance of Error', () => {
    const error = new AccessTokenError('Token missing');
    expect(error instanceof Error).toBe(true);
  });
});

describe('EditorialWorkflowError', () => {
  it('sets message on the instance', () => {
    const error = new EditorialWorkflowError('Entry not found', true);
    expect(error.message).toBe('Entry not found');
  });

  it('sets notUnderEditorialWorkflow when true', () => {
    const error = new EditorialWorkflowError('Not under workflow', true);
    expect(error.notUnderEditorialWorkflow).toBe(true);
  });

  it('sets notUnderEditorialWorkflow when false', () => {
    const error = new EditorialWorkflowError('Under workflow', false);
    expect(error.notUnderEditorialWorkflow).toBe(false);
  });

  it('sets name to EDITORIAL_WORKFLOW_ERROR constant', () => {
    const error = new EditorialWorkflowError('Entry not found', true);
    expect(error.name).toBe(EDITORIAL_WORKFLOW_ERROR);
  });

  it('is an instance of Error', () => {
    const error = new EditorialWorkflowError('Some error', true);
    expect(error instanceof Error).toBe(true);
  });
});

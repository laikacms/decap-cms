import EditorialWorkflowError, { EDITORIAL_WORKFLOW_ERROR } from '../EditorialWorkflowError';

describe('EditorialWorkflowError', () => {
  it('sets name to EDITORIAL_WORKFLOW_ERROR constant', () => {
    const error = new EditorialWorkflowError('Entry not found', true);
    expect(error.name).toBe(EDITORIAL_WORKFLOW_ERROR);
  });

  it('preserves the message from constructor argument', () => {
    const error = new EditorialWorkflowError('Entry not found', true);
    expect(error.message).toBe('Entry not found');
  });

  it('sets notUnderEditorialWorkflow to true when passed true', () => {
    const error = new EditorialWorkflowError('Not under workflow', true);
    expect(error.notUnderEditorialWorkflow).toBe(true);
  });

  it('sets notUnderEditorialWorkflow to false when passed false', () => {
    const error = new EditorialWorkflowError('Under workflow', false);
    expect(error.notUnderEditorialWorkflow).toBe(false);
  });

  it('is an instance of Error', () => {
    const error = new EditorialWorkflowError('Some error', true);
    expect(error instanceof Error).toBe(true);
  });
});

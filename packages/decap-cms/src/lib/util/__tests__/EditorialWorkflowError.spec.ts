import { describe, expect, it } from 'vitest';

import EditorialWorkflowError, { EDITORIAL_WORKFLOW_ERROR } from '@/lib/util/EditorialWorkflowError.js';

describe('EditorialWorkflowError', () => {
  it('sets message and name, and notUnderEditorialWorkflow to true', () => {
    const error = new EditorialWorkflowError('not under editorial workflow', true);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(EditorialWorkflowError);
    expect(error.message).toBe('not under editorial workflow');
    expect(error.name).toBe(EDITORIAL_WORKFLOW_ERROR);
    expect(error.notUnderEditorialWorkflow).toBe(true);
  });

  it('sets notUnderEditorialWorkflow to false', () => {
    const error = new EditorialWorkflowError('under editorial workflow', false);

    expect(error.notUnderEditorialWorkflow).toBe(false);
  });
});

// Create/edit workflow modes
export const SIMPLE = 'simple';
export const EDITORIAL_WORKFLOW = 'editorial_workflow';

export const Statues = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PENDING_PUBLISH: 'pending_publish',
};

// Available status
export const status = Statues;

export const statusDescriptions = {
  [status.DRAFT]: 'Draft',
  [status.PENDING_REVIEW]: 'Waiting for Review',
  [status.PENDING_PUBLISH]: 'Waiting to go live',
};

export type Status = keyof typeof Statues;

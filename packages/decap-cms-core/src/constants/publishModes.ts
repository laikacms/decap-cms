// Create/edit workflow modes
export const SIMPLE = 'simple';
export const EDITORIAL_WORKFLOW = 'editorial_workflow';

export const Statuses = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PENDING_PUBLISH: 'pending_publish',
} as const;

export const status = Statuses;

export const statusDescriptions: Record<string, string> = {
  [Statuses.DRAFT]: 'Draft',
  [Statuses.PENDING_REVIEW]: 'Waiting for Review',
  [Statuses.PENDING_PUBLISH]: 'Waiting to go live',
};

export type Status = keyof typeof Statuses;

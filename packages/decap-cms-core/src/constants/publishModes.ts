import { Map, OrderedMap } from 'immutable';

// Create/edit workflow modes
export const SIMPLE = 'simple';
export const EDITORIAL_WORKFLOW = 'editorial_workflow';

export const Statues = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PENDING_PUBLISH: 'pending_publish',
};

// Available status
export const status = OrderedMap(Statues);

export const statusDescriptions = Map({
  [status.get('DRAFT') as string]: 'Draft',
  [status.get('PENDING_REVIEW') as string]: 'Waiting for Review',
  [status.get('PENDING_PUBLISH') as string]: 'Waiting to go live',
});

export type Status = keyof typeof Statues;

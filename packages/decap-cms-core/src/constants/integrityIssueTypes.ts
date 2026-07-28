const IntegrityIssueTypes = {
  DANGLING_RELATION: 'DANGLING_RELATION',
  DUPLICATE_UNIQUE_VALUE: 'DUPLICATE_UNIQUE_VALUE',
} as const;

export type IntegrityIssueType =
  (typeof IntegrityIssueTypes)[keyof typeof IntegrityIssueTypes];

export default IntegrityIssueTypes;

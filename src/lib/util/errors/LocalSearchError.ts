export const LOCAL_SEARCH_ERROR = 'LOCAL_SEARCH_ERROR';

export class LocalSearchError extends Error {
  message: string;
  errors: Error[];

  constructor(message: string, errors: Error[]) {
    super(message);
    this.message = message;
    this.errors = errors;
    this.name = LOCAL_SEARCH_ERROR;
  }
}

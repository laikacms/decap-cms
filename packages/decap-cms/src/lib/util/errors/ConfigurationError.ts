export const CONFIGURATION_ERROR = 'CONFIGURATION_ERROR';

export class ConfigurationError extends Error {
  message: string;

  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = CONFIGURATION_ERROR;
  }
}

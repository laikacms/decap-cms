import winston from 'winston';

import { createLogger } from '../logger';

describe('createLogger', () => {
  it('returns a winston Logger instance', () => {
    const logger = createLogger({ level: 'info' });
    expect(logger).toBeInstanceOf(winston.Logger);
  });

  it('respects the level option', () => {
    const logger = createLogger({ level: 'debug' });
    expect(logger.level).toBe('debug');
  });

  it('configures exactly one Console transport', () => {
    const logger = createLogger({ level: 'info' });
    expect(logger.transports).toHaveLength(1);
    expect(logger.transports[0]).toBeInstanceOf(winston.transports.Console);
  });
});

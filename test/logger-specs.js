// transpile:mocha

import { init as logsinkInit } from '../lib/logsink';
import logger from '../lib/logger';

describe('Logger', () => {
  before(() => {
    logsinkInit({});
  });
  it('should work', () => {
    logger.warn('something');
    logger.debug('something');
  });
});

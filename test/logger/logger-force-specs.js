// transpile:mocha

import { getDynamicLogger, restoreWriters, setupWriters,
         assertOutputContains } from './helpers';

describe('logger with force log', () => {
  let writers, log;
  before(() => {
    writers = setupWriters();
    log = getDynamicLogger(true, true);
    log.level = 'silly';
  });

  after(() => {
    restoreWriters(writers);
  });

  it('should not rewrite log levels even during testing', () => {
    log.silly('silly');
    assertOutputContains(writers, 'silly');
    log.verbose('verbose');
    assertOutputContains(writers, 'verbose');
    log.verbose('debug');
    assertOutputContains(writers, 'debug');
    log.info('info');
    assertOutputContains(writers, 'info');
    log.http('http');
    assertOutputContains(writers, 'http');
    log.warn('warn');
    assertOutputContains(writers, 'warn');
    log.error('error');
    assertOutputContains(writers, 'error');
    (() => { log.errorAndThrow('msg'); }).should.throw('msg');
    assertOutputContains(writers, 'error');
    assertOutputContains(writers, 'msg');
  });
});

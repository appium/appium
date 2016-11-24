// transpile:mocha

import { getDynamicLogger, restoreWriters, setupWriters,
         assertOutputContains, assertOutputDoesntContain } from './helpers';

describe('normal logger', () => {
  let writers, log;
  beforeEach(() => {
    writers = setupWriters();
    log = getDynamicLogger(false, false);
    log.level = 'silly';
  });

  afterEach(() => {
    restoreWriters(writers);
  });

  it('should not rewrite log levels outside of testing', () => {
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
  });
  it('throw should not rewrite log levels outside of testing and throw error', () => {
    (() => { log.errorAndThrow('msg1'); }).should.throw('msg1');
    (() => { log.errorAndThrow(new Error('msg2')); }).should.throw('msg2');
    assertOutputContains(writers, 'msg1');
    assertOutputContains(writers, 'msg2');
  });
  it('should get and set log levels', () => {
    log.level = 'warn';
    log.level.should.equal('warn');
    log.info('information');
    log.warn('warning');
    assertOutputDoesntContain(writers, 'information');
    assertOutputContains(writers, 'warning');
  });
});

describe('normal logger with prefix', () => {
  let writers, log;
  before(() => {
    writers = setupWriters();
    log = getDynamicLogger(false, false, 'myprefix');
    log.level = 'silly';
  });

  after(() => {
    restoreWriters(writers);
  });

  it('should not rewrite log levels outside of testing', () => {
    log.silly('silly');
    assertOutputContains(writers, 'silly');
    assertOutputContains(writers, 'myprefix');
    log.verbose('verbose');
    assertOutputContains(writers, 'verbose');
    assertOutputContains(writers, 'myprefix');
    log.verbose('debug');
    assertOutputContains(writers, 'debug');
    assertOutputContains(writers, 'myprefix');
    log.info('info');
    assertOutputContains(writers, 'info');
    assertOutputContains(writers, 'myprefix');
    log.http('http');
    assertOutputContains(writers, 'http');
    assertOutputContains(writers, 'myprefix');
    log.warn('warn');
    assertOutputContains(writers, 'warn');
    assertOutputContains(writers, 'myprefix');
    log.error('error');
    assertOutputContains(writers, 'error');
    assertOutputContains(writers, 'myprefix');
  });
  it('throw should not rewrite log levels outside of testing and throw error', () => {
    (() => { log.errorAndThrow('msg'); }).should.throw('msg');
    assertOutputContains(writers, 'error');
    assertOutputContains(writers, 'myprefix');
  });
});

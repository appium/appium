import assert from 'node:assert/strict';
import {after, afterEach, before, beforeEach, describe, it} from 'node:test';

import {
  assertOutputContains,
  assertOutputDoesntContain,
  getDynamicLogger,
  restoreWriters,
  setupWriters,
} from './helpers.js';

const LOG_LEVELS = ['silly', 'verbose', 'info', 'http', 'warn', 'error'];

describe('normal logger', function () {
  let writers: ReturnType<typeof setupWriters>;
  let log: ReturnType<typeof getDynamicLogger>;

  beforeEach(function () {
    writers = setupWriters();
    log = getDynamicLogger(false, false);
    log.level = 'silly';
  });

  afterEach(function () {
    restoreWriters(writers);
  });

  it('should not rewrite log levels outside of testing', function () {
    for (const levelName of LOG_LEVELS) {
      (log as any)[levelName](levelName);
      assertOutputContains(writers, levelName);
    }
  });
  it('throw should not rewrite log levels outside of testing and throw error', function () {
    assert.throws(() => {
      throw log.errorWithException('msg1');
    }, /msg1/);
    assert.throws(() => {
      throw log.errorWithException(new Error('msg2'));
    }, /msg2/);
    assertOutputContains(writers, 'msg1');
    assertOutputContains(writers, 'msg2');
  });
  it('should get and set log levels', function () {
    log.level = 'warn';
    assert.strictEqual(log.level, 'warn');
    log.info('information');
    log.warn('warning');
    assertOutputDoesntContain(writers, 'information');
    assertOutputContains(writers, 'warning');
  });
  it('should split lines of multi-line logs', function () {
    log.level = 'warn';
    log.warn('this is one line\nand this is another');
    assertOutputDoesntContain(writers, 'this is one line\nand this is another');
    assertOutputContains(writers, 'this is one line');
    assertOutputContains(writers, 'and this is another');
  });
  it('should split stack trace of Error', function () {
    log.level = 'warn';
    const error = new Error('this is an error');
    error.stack = 'stack line 1\nstack line 2';
    log.warn(error);
    assertOutputDoesntContain(writers, 'stack line 1\nstack line 2');
    assertOutputContains(writers, 'stack line 1');
    assertOutputContains(writers, 'stack line 2');
  });
});

describe('normal logger with static prefix', function () {
  let writers: ReturnType<typeof setupWriters>;
  let log: ReturnType<typeof getDynamicLogger>;
  const PREFIX = 'my_static_prefix';

  before(function () {
    writers = setupWriters();
    log = getDynamicLogger(false, false, PREFIX);
    log.level = 'silly';
  });

  after(function () {
    restoreWriters(writers);
  });

  it('should not rewrite log levels outside of testing', function () {
    for (const levelName of LOG_LEVELS) {
      (log as any)[levelName](levelName);
      assertOutputContains(writers, levelName);
      assertOutputContains(writers, PREFIX);
    }
  });
  it('throw should not rewrite log levels outside of testing and throw error', function () {
    assert.throws(() => {
      throw log.errorWithException('msg');
    }, /msg/);
    assertOutputContains(writers, 'error');
    assertOutputContains(writers, PREFIX);
  });
});

describe('normal logger with dynamic prefix', function () {
  let writers: ReturnType<typeof setupWriters>;
  let log: ReturnType<typeof getDynamicLogger>;
  const PREFIX = 'my_dynamic_prefix';

  before(function () {
    writers = setupWriters();
    log = getDynamicLogger(false, false, () => PREFIX);
    log.level = 'silly';
  });

  after(function () {
    restoreWriters(writers);
  });

  it('should not rewrite log levels outside of testing', function () {
    for (const levelName of LOG_LEVELS) {
      (log as any)[levelName](levelName);
      assertOutputContains(writers, levelName);
      assertOutputContains(writers, PREFIX);
    }
  });
  it('throw should not rewrite log levels outside of testing and throw error', function () {
    assert.throws(() => {
      throw log.errorWithException('msg');
    }, /msg/);
    assertOutputContains(writers, 'error');
    assertOutputContains(writers, PREFIX);
  });
});

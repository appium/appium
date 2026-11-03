import assert from 'node:assert/strict';
import {after, before, describe, it} from 'node:test';

import {assertOutputDoesntContain, getDynamicLogger, restoreWriters, setupWriters} from './helpers.js';

describe('test logger', function () {
  let writers: ReturnType<typeof setupWriters>;
  let log: ReturnType<typeof getDynamicLogger>;

  before(function () {
    writers = setupWriters();
    log = getDynamicLogger(true, false);
  });

  after(function () {
    restoreWriters(writers);
  });

  it('should contains levels', function () {
    assert.ok(log.levels.length > 3);
    assert.strictEqual(log.levels[2], 'debug');
  });

  it('should unwrap', function () {
    assert.ok(log.unwrap);
    assert.ok(log.unwrap());
  });

  it('should rewrite npmlog levels during testing', function () {
    const text = 'hi';
    log.silly(text);
    log.verbose(text);
    log.info(text);
    log.http(text);
    log.warn(text);
    log.error(text);
    assert.throws(() => {
      throw log.errorWithException(text);
    }, new RegExp(text));
    assertOutputDoesntContain(writers, text);
  });
});

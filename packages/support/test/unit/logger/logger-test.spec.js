// transpile:mocha

import {getDynamicLogger, restoreWriters, setupWriters, assertOutputDoesntContain} from './helpers';

describe('test logger', function () {
  let writers, log;
  before(function () {
    writers = setupWriters();
    log = getDynamicLogger(true);
  });

  after(function () {
    restoreWriters(writers);
  });

  it('should contains levels', function () {
    log.levels.should.have.length.above(3);
    log.levels[2].should.equal('debug');
  });

  it('should unwrap', function () {
    log.unwrap.should.exist;
    log.unwrap().should.exist;
  });

  it('should rewrite npmlog levels during testing', function () {
    const text = 'hi';
    log.silly(text);
    log.verbose(text);
    log.info(text);
    log.http(text);
    log.warn(text);
    log.error(text);
    (() => {
      log.errorAndThrow(text);
    }).should.throw(text);
    assertOutputDoesntContain(writers, text);
  });
});

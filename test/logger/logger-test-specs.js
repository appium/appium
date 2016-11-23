// transpile:mocha

import { getDynamicLogger, restoreWriters, setupWriters,
         assertOutputDoesntContain } from './helpers';

describe('test logger', () => {
  let writers, log;
  before(() => {
    writers = setupWriters();
    log = getDynamicLogger(true);
  });

  after(() => {
    restoreWriters(writers);
  });

  it('should contains levels', () => {
    log.levels.should.have.length.above(3);
    log.levels[2].should.equal('debug');
  });

  it('should unwrap', () => {
    log.unwrap.should.exist;
    log.unwrap().should.exist;
  });

  it('should rewrite npmlog levels during testing', () => {
    const text = 'hi';
    log.silly(text);
    log.verbose(text);
    log.info(text);
    log.http(text);
    log.warn(text);
    log.error(text);
    (() => { log.errorAndThrow(text); }).should.throw(text);
    assertOutputDoesntContain(writers, text);
  });
});

import {expect} from 'chai';
import * as chai from 'chai';
import {
  getDynamicLogger,
  restoreWriters,
  setupWriters,
  assertOutputDoesntContain,
} from './helpers';

describe('test logger', function () {
  let writers: ReturnType<typeof setupWriters>;
  let log: ReturnType<typeof getDynamicLogger>;

  before(function () {
    chai.should();
    writers = setupWriters();
    log = getDynamicLogger(true, false);
  });

  after(function () {
    restoreWriters(writers);
  });

  it('should contains levels', function () {
    expect(log.levels).to.have.length.above(3);
    expect(log.levels[2]).to.equal('debug');
  });

  it('should unwrap', function () {
    expect(log.unwrap).to.exist;
    expect(log.unwrap()).to.exist;
  });

  it('should rewrite npmlog levels during testing', function () {
    const text = 'hi';
    log.silly(text);
    log.verbose(text);
    log.info(text);
    log.http(text);
    log.warn(text);
    log.error(text);
    expect(() => {
      throw log.errorWithException(text);
    }).to.throw(text);
    assertOutputDoesntContain(writers, text);
  });
});

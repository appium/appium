import _ from 'lodash';
import { createSandbox } from 'sinon';
import { timing } from '../../lib';


const expect = chai.expect;

describe('timing', function () {
  let processMock;
  let sandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    processMock.verify();
    sandbox.restore();
  });

  describe('no bigint', function () {
    const bigintFn = process.hrtime.bigint;
    before(function () {
      // if the system has BigInt support, remove it
      if (_.isFunction(bigintFn)) {
        delete process.hrtime.bigint;
      }
    });
    beforeEach(function () {
      processMock = sandbox.mock(process);
    });
    after(function () {
      if (_.isFunction(bigintFn)) {
        process.hrtime.bigint = bigintFn;
      }
    });
    it('should get a start time as array', function () {
      const timer = new timing.Timer().start();
      _.isArray(timer.startTime).should.be.true;
    });
    it('should get a duration', function () {
      const timer = new timing.Timer().start();
      const duration = timer.getDuration();
      _.isNumber(duration.nanos).should.be.true;
    });
    it('should get correct seconds', function () {
      processMock.expects('hrtime').twice()
        .onFirstCall().returns([12, 12345])
        .onSecondCall().returns([13, 54321]);

      const timer = new timing.Timer().start();
      const duration = timer.getDuration();
      duration.asSeconds.should.eql(13.000054321);
    });
    it('should get correct milliseconds', function () {
      processMock.expects('hrtime').twice()
        .onFirstCall().returns([12, 12345])
        .onSecondCall().returns([13, 54321]);

      const timer = new timing.Timer().start();
      const duration = timer.getDuration();
      duration.asMilliSeconds.should.eql(13000.054321);
    });
    it('should get correct nanoseconds', function () {
      processMock.expects('hrtime').twice()
        .onFirstCall().returns([12, 12345])
        .onSecondCall().returns([13, 54321]);

      const timer = new timing.Timer().start();
      const duration = timer.getDuration();
      duration.asNanoSeconds.should.eql(13000054321);
    });
    it('should error if the timer was not started', function () {
      const timer = new timing.Timer();
      expect(() => timer.getDuration())
        .to.throw('Unable to get duration');
    });
    it('should error if start time is a number', function () {
      const timer = new timing.Timer();
      timer._startTime = 12345;
      expect(() => timer.getDuration())
        .to.throw('Unable to get duration');
    });
  });
  describe('bigint', function () {
    beforeEach(function () {
      // the non-mocked test cannot run if BigInt does not exist,
      // and it cannot be mocked. Luckily support was added in Node 10.4.0,
      // so it should not be a case where we are testing without this,
      // though it still can be a test that Appium is _used_ without it.
      if (!_.isFunction(process.hrtime.bigint)) {
        return this.skip();
      }
      processMock = sandbox.mock(process.hrtime);
    });

    function setupMocks (once = false) {
      if (once) {
        processMock.expects('bigint').once()
          .onFirstCall().returns(BigInt(1172941153404030));
      } else {
        processMock.expects('bigint').twice()
          .onFirstCall().returns(BigInt(1172941153404030))
          .onSecondCall().returns(BigInt(1172951164887132));
      }
    }

    it('should get a duration', function () {
      setupMocks();

      const timer = new timing.Timer().start();
      const duration = timer.getDuration();
      _.isNumber(duration.nanos).should.be.true;
    });
    it('should get correct seconds', function () {
      setupMocks();

      const timer = new timing.Timer().start();
      const duration = timer.getDuration();
      duration.asSeconds.should.be.eql(10.011483102);
    });
    it('should get correct milliseconds', function () {
      setupMocks();

      const timer = new timing.Timer().start();
      const duration = timer.getDuration();
      duration.asMilliSeconds.should.be.eql(10011.483102);
    });
    it('should get correct nanoseconds', function () {
      setupMocks();

      const timer = new timing.Timer().start();
      const duration = timer.getDuration();
      duration.asNanoSeconds.should.be.eql(10011483102);
    });
    it('should error if the timer was not started', function () {
      const timer = new timing.Timer();
      expect(() => timer.getDuration())
        .to.throw('Unable to get duration');
    });
    it('should error if passing in a non-bigint', function () {
      const timer = new timing.Timer();
      timer._startTime = 12345;
      expect(() => timer.getDuration())
        .to.throw('Unable to get duration');
    });
  });
});

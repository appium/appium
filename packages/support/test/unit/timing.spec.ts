import _ from 'lodash';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createSandbox} from 'sinon';
import {timing} from '../../lib';

describe('timing', function () {
  let processMock: ReturnType<ReturnType<typeof createSandbox>['mock']>;
  let sandbox: ReturnType<typeof createSandbox>;

  before(function () {
    use(chaiAsPromised);
  });

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    if (processMock) {
      processMock.verify();
    }
    sandbox.restore();
  });

  describe('bigint', function () {
    beforeEach(function () {
      if (!_.isFunction(process.hrtime.bigint)) {
        return this.skip();
      }
      processMock = sandbox.mock(process.hrtime);
    });

    function setupMocks(once = false) {
      if (once) {
        processMock.expects('bigint').once().onFirstCall().returns(BigInt(1172941153404030));
      } else {
        processMock
          .expects('bigint')
          .twice()
          .onFirstCall()
          .returns(BigInt(1172941153404030))
          .onSecondCall()
          .returns(BigInt(1172951164887132));
      }
    }

    it('should get a duration', function () {
      setupMocks();

      const timer = new timing.Timer().start();
      const duration = timer.getDuration();
      expect(_.isNumber(duration.nanos)).to.be.true;
    });
    it('should get correct seconds', function () {
      setupMocks();

      const timer = new timing.Timer().start();
      const duration = timer.getDuration();
      expect(duration.asSeconds).to.eql(10.011483102);
    });
    it('should get correct milliseconds', function () {
      setupMocks();

      const timer = new timing.Timer().start();
      const duration = timer.getDuration();
      expect(duration.asMilliSeconds).to.eql(10011.483102);
    });
    it('should get correct nanoseconds', function () {
      setupMocks();

      const timer = new timing.Timer().start();
      const duration = timer.getDuration();
      expect(duration.asNanoSeconds).to.eql(10011483102);
    });
    it('should error if the timer was not started', function () {
      const timer = new timing.Timer();
      expect(() => timer.getDuration()).to.throw('Unable to get duration');
    });
    it('should error if passing in a non-bigint', function () {
      const timer = new timing.Timer();
      (timer as any)._startTime = 12345;
      expect(() => timer.getDuration()).to.throw('Unable to get duration');
    });
  });
});

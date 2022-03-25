import { fakeTime } from '../../lib';

import sinon from 'sinon';
import B from 'bluebird';


function doSomething () {
  return new B.Promise((resolve) => {
    let ret = '';
    function appendOneByOne () {
      if (ret.length >= 10) {
        return resolve(ret);
      }
      setTimeout(() => {
        ret = ret + ret.length;
        appendOneByOne();
      }, 1000);
    }
    appendOneByOne();
  });
}

describe('time-utils', function () {
  describe('fakeTime', function () {
    let sandbox;
    beforeEach(function () {
      sandbox = sinon.createSandbox();
    });
    afterEach(function () {
      sandbox.restore();
    });
    it('should fake time', async function () {
      let timeLord = fakeTime(sandbox);
      let p = doSomething();
      timeLord.speedup(200, 60);
      (await p).should.equals('0123456789');
    });
  });
});

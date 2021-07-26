import { parseServerArgs } from '../../lib/basedriver/arguments';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import _ from 'lodash';

chai.use(chaiAsPromised);

describe('parseServerArgs', function () {
  const webkitDebugProxyPort = 22222;
  const wdaLocalPort = 8000;
  const driverArgs = { wdaLocalPort, webkitDebugProxyPort };
  const opts = {'foo': 'bar', 'foobar': 'foobar'};
  const ARGS_CONSTRAINTS = {
    webkitDebugProxyPort: {
      isNumber: true
    },
    wdaLocalPort: {
      isNumber: true
    },
  };

  it('should return driver args if passed in', function () {
    parseServerArgs({}, driverArgs, ARGS_CONSTRAINTS).should.eql(driverArgs);
  });
  it('should assign driver args to opts if passed in', function () {
    parseServerArgs(opts, driverArgs, ARGS_CONSTRAINTS).should.eql(_.assign(opts, driverArgs));
  });
  it('should use opts args if driver args not passed in', function () {
    parseServerArgs(_.assign(opts, driverArgs), {}, ARGS_CONSTRAINTS).should.eql(_.assign(opts, driverArgs));
  });
  it('should return empty object if no args were passed in', function () {
    parseServerArgs({}, {}, ARGS_CONSTRAINTS).should.eql({});
  });
  describe('wdaLocalPort arg', function () {
    it('should return empty obj if driverArgs is empty', function () {
      parseServerArgs({}, {}, ARGS_CONSTRAINTS).should.eql({});
    });
    it(`should throw error if value of 'wdaLocalPort' is not an int`, function () {
      (() => parseServerArgs({}, {'wdaLocalPort': 'foo'}, ARGS_CONSTRAINTS)).should.throw();
    });
    it(`should throw if unreconized key is passed`, function () {
      (() => parseServerArgs({}, {'foo': 'bar'}, ARGS_CONSTRAINTS)).should.throw();
    });
    it('should return passed in driver arg value', function () {
      parseServerArgs({}, {wdaLocalPort}, ARGS_CONSTRAINTS).wdaLocalPort.should.equal(wdaLocalPort);
    });
  });
});
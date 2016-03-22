// transpile:mocha

import { init as logsinkInit, clear as logsinkClear } from '../lib/logsink';
import sinon from 'sinon';
import { getLogger } from 'appium-logger';


// temporarily turn on logging to stdio, so we can catch and query
let forceLogs = process.env._FORCE_LOGS;
process.env._FORCE_LOGS = 1;
let logger = getLogger('Appium');

describe('Logger', () => {
  let stderrSpy;
  let stdoutSpy;
  beforeEach(() => {
    stderrSpy = sinon.spy(process.stderr, 'write');
    stdoutSpy = sinon.spy(process.stdout, 'write');
    logsinkClear();
  });
  afterEach(() => {
    stderrSpy.restore();
    stdoutSpy.restore();
  });
  after(() => {
    process.env._FORCE_LOGS = forceLogs;
  });

  const errorMsg = 'some error';
  const warnMsg = 'some warning';
  const debugMsg = 'some debug';

  function doLogging () {
    logger.error(errorMsg);
    logger.warn(warnMsg);
    logger.debug(debugMsg);
  }

  it('should send error, info and debug when loglevel is debug', async () => {
    await logsinkInit({loglevel: 'debug'});

    doLogging();

    stderrSpy.callCount.should.equal(1);
    stderrSpy.args[0][0].should.include(errorMsg);

    stdoutSpy.callCount.should.equal(2);
    stdoutSpy.args[0][0].should.include(warnMsg);
    stdoutSpy.args[1][0].should.include(debugMsg);
  });
  it('should send error and info when loglevel is info', async () => {
    await logsinkInit({loglevel: 'info'});

    doLogging();

    stderrSpy.callCount.should.equal(1);
    stderrSpy.args[0][0].should.include(errorMsg);

    stdoutSpy.callCount.should.equal(1);
    stdoutSpy.args[0][0].should.include(warnMsg);
  });
  it('should send error when loglevel is error', async () => {
    await logsinkInit({loglevel: 'error'});

    doLogging();

    stderrSpy.callCount.should.equal(1);
    stderrSpy.args[0][0].should.include(errorMsg);

    stdoutSpy.callCount.should.equal(0);
  });
});

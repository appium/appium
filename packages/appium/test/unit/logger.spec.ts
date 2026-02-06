import {init as logsinkInit, clear as logsinkClear} from '../../lib/logsink';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createSandbox, type SinonSandbox} from 'sinon';
import {logger} from '@appium/support';

const forceLogs = process.env._FORCE_LOGS;
process.env._FORCE_LOGS = '1';
const log = logger.getLogger('Appium');

describe('logging', function () {
  let sandbox: SinonSandbox;
  let stderrSpy: import('sinon').SinonSpy;
  let stdoutSpy: import('sinon').SinonSpy;

  beforeEach(async function () {
    use(chaiAsPromised);

    sandbox = createSandbox();
    stderrSpy = sandbox.spy(process.stderr, 'write') as import('sinon').SinonSpy;
    stdoutSpy = sandbox.spy(process.stdout, 'write') as import('sinon').SinonSpy;
    logsinkClear();
  });

  afterEach(function () {
    sandbox.restore();
  });

  after(function () {
    process.env._FORCE_LOGS = forceLogs;
  });

  const errorMsg = 'some error';
  const warnMsg = 'some warning';
  const debugMsg = 'some debug';

  function doLogging() {
    log.error(errorMsg);
    log.warn(warnMsg);
    log.debug(debugMsg);
  }

  it('should send error, info and debug when loglevel is debug', async function () {
    await logsinkInit({loglevel: 'debug'} as Parameters<typeof logsinkInit>[0]);

    doLogging();

    expect(stderrSpy.callCount).to.equal(1);
    expect(stderrSpy.args[0][0]).to.include(errorMsg);

    expect(stdoutSpy.callCount).to.equal(2);
    expect(stdoutSpy.args[0][0]).to.include(warnMsg);
    expect(stdoutSpy.args[1][0]).to.include(debugMsg);
  });

  it('should send error and info when loglevel is info', async function () {
    await logsinkInit({loglevel: 'info'} as Parameters<typeof logsinkInit>[0]);

    doLogging();

    expect(stderrSpy.callCount).to.equal(1);
    expect(stderrSpy.args[0][0]).to.include(errorMsg);

    expect(stdoutSpy.callCount).to.equal(1);
    expect(stdoutSpy.args[0][0]).to.include(warnMsg);
  });

  it('should send error when loglevel is error', async function () {
    await logsinkInit({loglevel: 'error'} as Parameters<typeof logsinkInit>[0]);

    doLogging();

    expect(stderrSpy.callCount).to.equal(1);
    expect(stderrSpy.args[0][0]).to.include(errorMsg);

    expect(stdoutSpy.callCount).to.equal(0);
  });
});

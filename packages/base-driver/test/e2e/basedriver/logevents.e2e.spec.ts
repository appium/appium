import type {Constraints, Driver, EventHistoryCommand} from '@appium/types';
import axios from 'axios';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {createSandbox} from 'sinon';
import {createServer} from '../../helpers';
import {MockExecuteDriver} from '../protocol/mock-execute-driver';

chai.use(chaiAsPromised);

describe('Execute Command Test', function () {
  let sandbox: sinon.SinonSandbox;
  let driver: MockExecuteDriver;
  let baseUrl: string;
  let teardown: () => Promise<void> | undefined;

  beforeEach(async function () {
    sandbox = createSandbox();
    driver = new MockExecuteDriver();
    driver.sessionId = 'foo';

    const {
      setup,
      teardown: teardownFn,
      baseUrl: baseUrlStr,
    } = await createServer(driver as unknown as Driver<Constraints>);
    baseUrl = baseUrlStr;
    teardown = teardownFn;
    await setup();
  });

  afterEach(async function () {
    sandbox.restore();
    await teardown?.();
  });

  it('should rename extended command and log it in event history', async function () {
    const script = 'mobile: activateApp';
    const args = [{appId: 'io.appium.TestApp'}];

    const res = await axios.post(`${baseUrl}/session/foo/execute/sync`, {
      script,
      args,
    });

    expect(res.status).to.eql(200);
    expect(res.data).to.have.property('value');
    expect(res.data.value).to.deep.equal({executed: script, args});

    const events = await driver.getLogEvents();
    const command = (events.commands as EventHistoryCommand[])[0];

    expect(command).to.have.property('cmd', 'mobileActivateApp');
  });
});

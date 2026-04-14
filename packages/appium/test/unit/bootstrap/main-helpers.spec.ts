import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type {SinonSandbox, SinonSpy} from 'sinon';
import {createSandbox} from 'sinon';
import {stripColors} from '@colors/colors';
import {getBuildInfo} from '../../../lib/helpers/build';
import {inspect, showBuildInfo} from '../../../lib/bootstrap/main-helpers';
import {log as logger} from '../../../lib/logger';

const {expect} = chai;
chai.use(chaiAsPromised);

describe('bootstrap/main-helpers', function () {
  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('showBuildInfo()', function () {
    let log: SinonSpy;

    beforeEach(function () {
      log = sandbox.spy(console, 'log');
    });

    it('should log build info to console', async function () {
      const config = getBuildInfo();
      await showBuildInfo();
      expect(log.calledOnce).to.be.true;
      expect(log.firstCall.args).to.contain(JSON.stringify(config));
    });
  });

  describe('inspect()', function () {
    it('should log the result of inspecting a value', function () {
      const infoLog = sandbox.spy(logger, 'info');
      inspect({foo: 'bar'});
      expect(stripColors(infoLog.firstCall.firstArg)).to.match(/\{\s*\n*foo:\s'bar'\s*\n*\}/);
    });
  });
});

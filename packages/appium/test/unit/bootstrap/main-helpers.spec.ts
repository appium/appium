import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type {SinonSandbox, SinonSpy} from 'sinon';
import {createSandbox} from 'sinon';
import {getBuildInfo} from '../../../lib/helpers/build';
import {showBuildInfo} from '../../../lib/bootstrap/main-helpers';

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
});

import {inspect} from '../../lib/bootstrap/main-helpers';
import {adjustNodePath} from '../../lib/bootstrap/node-helpers';
import {stripColors} from '@colors/colors';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';
import {log as logger} from '../../lib/logger';
import {fs} from '@appium/support';

describe('utils', function () {
  beforeEach(async function () {
    use(chaiAsPromised);
  });

  describe('inspect()', function () {
    let sandbox: SinonSandbox;

    beforeEach(function () {
      sandbox = createSandbox();
      sandbox.spy(logger, 'info');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should log the result of inspecting a value', function () {
      inspect({foo: 'bar'});
      expect(
        stripColors((logger.info as SinonStub).firstCall.firstArg)
      ).to.match(/\{\s*\n*foo:\s'bar'\s*\n*\}/);
    });
  });

  describe('adjustNodePath()', function () {
    const prevValue = process.env.NODE_PATH;

    beforeEach(function () {
      if (process.env.NODE_PATH) {
        delete process.env.NODE_PATH;
      }
    });

    afterEach(function () {
      if (prevValue) {
        process.env.NODE_PATH = prevValue;
      }
    });

    it('should adjust NODE_PATH', async function () {
      adjustNodePath();
      await expect(fs.exists(process.env.NODE_PATH!)).to.eventually.be.true;
    });
  });
});

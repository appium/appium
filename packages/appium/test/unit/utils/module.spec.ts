import chai from 'chai';
import {createSandbox, type SinonSandbox} from 'sinon';
import {node} from '@appium/support';
import {getAppiumModuleRoot, npmPackage} from '../../../lib/utils/module';

const {expect} = chai;

type MemoizedWithCache = (() => string) & {
  cache: {
    clear: () => void;
  };
};

describe('utils/module', function () {
  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
    (getAppiumModuleRoot as MemoizedWithCache).cache.clear();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('npmPackage', function () {
    it('should expose package metadata', function () {
      expect(npmPackage).to.have.property('name', 'appium');
    });
  });

  describe('getAppiumModuleRoot()', function () {
    it('should return appium module root', function () {
      sandbox.stub(node, 'getModuleRootSync').returns('/tmp/appium');
      expect(getAppiumModuleRoot()).to.equal('/tmp/appium');
    });

    it('should memoize module root lookups', function () {
      const rootLookup = sandbox.stub(node, 'getModuleRootSync').returns('/tmp/appium');
      expect(getAppiumModuleRoot()).to.equal('/tmp/appium');
      expect(getAppiumModuleRoot()).to.equal('/tmp/appium');
      expect(rootLookup.calledOnce).to.be.true;
    });

    it('should throw when module root cannot be determined', function () {
      sandbox.stub(node, 'getModuleRootSync').returns(null);
      expect(getAppiumModuleRoot).to.throw(/Cannot find the appium module root/);
    });
  });
});

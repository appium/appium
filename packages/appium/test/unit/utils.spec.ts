import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createSandbox, type SinonSandbox} from 'sinon';
import {node} from '@appium/support';
import {adler32, getAppiumModuleRoot, npmPackage} from '../../lib/utils';

const {expect} = chai;
chai.use(chaiAsPromised);

type MemoizedWithCache = (() => string) & {
  cache: {
    clear: () => void;
  };
};

describe('utils', function () {
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

  describe('adler32()', function () {
    it('should compute checksum for known inputs', function () {
      expect(adler32('')).to.equal(1);
      expect(adler32('hello')).to.equal(103547413);
      expect(adler32('😀')).to.equal(122749608);
    });

    it('should support checksum seeding', function () {
      const seed = adler32('hello');
      expect(adler32(' world', seed)).to.equal(adler32('hello world'));
    });
  });
});

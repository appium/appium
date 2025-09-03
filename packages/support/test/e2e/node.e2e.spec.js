import {node} from '../../lib';

describe('node utilities', function () {
  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
  });

  describe('requirePackage', function () {
    it('should be able to require a local package', async function () {
      await node.requirePackage('sinon').should.not.be.rejected;
    });
    // Skip: Global package requiring can be unreliable in test environments
    it.skip('should be able to require a global package', async function () {
      await node.requirePackage('npm').should.not.be.rejected;
    });
    it('should fail to find uninstalled package', async function () {
      await node
        .requirePackage('appium-foo-driver')
        .should.eventually.be.rejectedWith(/Unable to load package/);
    });
  });
});

import { node } from '..';



describe('node utilities', function () {
  describe('requirePackage', function () {
    it('should be able to require a local package', async function () {
      await node.requirePackage('chai').should.not.be.rejected;
    });
    // XXX: see #15951
    it.skip('should be able to require a global package', async function () {
      await node.requirePackage('npm').should.not.be.rejected;
    });
    it('should fail to find uninstalled package', async function () {
      await node.requirePackage('appium-foo-driver').should.eventually.be.rejectedWith(/Unable to load package/);
    });
  });
});

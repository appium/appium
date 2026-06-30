import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { describe, it } from 'node:test';
import { node } from '../../lib';

use(chaiAsPromised);

describe('node utilities', function() {
  describe('requirePackage', function() {
    it('should be able to require a local package', async function() {
      await expect(node.requirePackage('sinon')).to.not.be.rejected;
    });
    // XXX: see #15951
    it.skip('should be able to require a global package', async function() {
      await expect(node.requirePackage('npm')).to.not.be.rejected;
    });
    it('should fail to find uninstalled package', async function() {
      await expect(node.requirePackage('appium-foo-driver')).to.eventually.be.rejectedWith(
        /Unable to load package/,
      );
    });
  });
});

import path from 'node:path';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {NPM, resolveFrom} from '../../lib/npm';

describe('npm', function () {
  before(function () {
    use(chaiAsPromised);
  });

  describe('resolveFrom()', function () {
    const supportRoot = path.join(__dirname, '..', '..');

    it('should resolve a package path from a directory', async function () {
      const resolved = await resolveFrom(supportRoot, 'semver/package.json');
      expect(resolved).to.match(/semver[/\\]package\.json$/);
    });

    it('should reject when the module cannot be resolved', async function () {
      await expect(resolveFrom(supportRoot, 'nonexistent-appium-package-xyz/package.json')).to
        .eventually.be.rejected;
    });
  });

  describe('getLatestSafeUpgradeFromVersions()', function () {
    const versions1 = [
      '0.1.0',
      '0.1.1',
      '0.2.0',
      '0.2.5',
      '1.0.0',
      '1.0.1',
      '1.1.5',
      '1.2.7',
      '2.0.0',
      '1.2.8-beta',
      '1.2.9-alpha',
      '1.3.0-rc',
      '2.0.1-beta',
    ];
    const npm = new NPM();
    it('should get the latest minor upgrade in a list of versions', function () {
      expect(npm.getLatestSafeUpgradeFromVersions('0.1.0', versions1)).to.eql('0.2.5');
      expect(npm.getLatestSafeUpgradeFromVersions('1.0.0', versions1)).to.eql('1.2.7');
      expect(npm.getLatestSafeUpgradeFromVersions('0.2.0', versions1)).to.eql('0.2.5');
    });
    it('should throw if the current version cannot be parsed', function () {
      expect(() => {
        npm.getLatestSafeUpgradeFromVersions('', versions1);
      }).to.throw();
    });
    it('should ignore an error if one of versions cannot be parsed', function () {
      expect(npm.getLatestSafeUpgradeFromVersions('0.1.0', ['', '0.2.0'])).to.eql('0.2.0');
    });
    it('should return null if no newer version is found', function () {
      expect(npm.getLatestSafeUpgradeFromVersions('10', versions1)).to.be.null;
    });
  });
});

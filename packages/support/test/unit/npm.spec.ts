import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it} from 'node:test';

import {NPM, resolveFrom} from '../../lib/npm';

describe('npm', function () {
  describe('resolveFrom()', function () {
    const supportRoot = path.join(__dirname, '..', '..');

    it('should resolve a package path from a directory', async function () {
      const resolved = await resolveFrom(supportRoot, 'semver/package.json');
      assert.match(resolved, /semver[/\\]package\.json$/);
    });

    it('should reject when the module cannot be resolved', async function () {
      await assert.rejects(resolveFrom(supportRoot, 'nonexistent-appium-package-xyz/package.json'));
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
      assert.strictEqual(npm.getLatestSafeUpgradeFromVersions('0.1.0', versions1), '0.2.5');
      assert.strictEqual(npm.getLatestSafeUpgradeFromVersions('1.0.0', versions1), '1.2.7');
      assert.strictEqual(npm.getLatestSafeUpgradeFromVersions('0.2.0', versions1), '0.2.5');
    });
    it('should throw if the current version cannot be parsed', function () {
      assert.throws(() => {
        npm.getLatestSafeUpgradeFromVersions('', versions1);
      });
    });
    it('should ignore an error if one of versions cannot be parsed', function () {
      assert.strictEqual(npm.getLatestSafeUpgradeFromVersions('0.1.0', ['', '0.2.0']), '0.2.0');
    });
    it('should return null if no newer version is found', function () {
      assert.strictEqual(npm.getLatestSafeUpgradeFromVersions('10', versions1), null);
    });
  });
});

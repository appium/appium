import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it} from 'node:test';
import type {TestContext} from 'node:test';

import {fs, system, tempDir} from '@appium/support';

import {NPM, resolveFrom} from '../../../lib/utils/npm.js';

describe('utils/npm', function () {
  it('explains when npm.cmd cannot be found and preserves the cause', {skip: !system.isWindows()}, async function (t) {
    const cause = new Error('not found: npm.cmd');
    t.mock.method(fs, 'which', async () => {
      throw cause;
    });
    await assert.rejects(new NPM().exec('version', [], {cwd: process.cwd()}), (error: Error) => {
      assert.match(error.message, /Cannot find npm\.cmd on PATH/);
      assert.equal(error.cause, cause);
      return true;
    });
  });

  describe('installPackage()', function () {
    for (const hasAppiumDependency of [false, true]) {
      it(`installs a local source directly with live links (has Appium dependency: ${hasAppiumDependency})`, async function (t) {
        const {cwd, pkgName, pkg, installPath} = await createInstalledPackage(t);
        const npm = new NPM();
        const exec = t.mock.method(npm, 'exec', async () => ({stdout: '', stderr: '', code: 0}));
        const source = path.join(cwd, 'source');

        const receipt = await npm.installPackage(cwd, source, {
          pkgName,
          installType: 'local',
          hasAppiumDependency,
        });

        assert.strictEqual(exec.mock.callCount(), 1);
        const [command, args, options] = exec.mock.calls[0].arguments;
        assert.strictEqual(command, 'install');
        assert.ok(args);
        assert.ok(options);
        assert.strictEqual(args.filter((arg) => arg === '--install-links=false').length, 1);
        assert.strictEqual(args.at(-1), source);
        assert.ok(args.includes('--save-dev'));
        assert.ok(args.includes('--no-audit'));
        assert.strictEqual(args.includes('--save-exact'), !hasAppiumDependency);
        assert.strictEqual(args.includes('--no-package-lock'), !hasAppiumDependency);
        assert.strictEqual(options.cwd, cwd);
        assert.strictEqual(options.json, true);
        assert.ok(options.lockFile);
        assert.deepStrictEqual(receipt, {installPath, pkg});
      });
    }

    for (const installType of ['npm', 'git', undefined]) {
      it(`does not override link configuration for ${installType ?? 'default'} installs`, async function (t) {
        const {cwd, pkgName} = await createInstalledPackage(t);
        const npm = new NPM();
        const exec = t.mock.method(npm, 'exec', async () => ({stdout: '', stderr: '', code: 0}));
        const spec = installType === 'git' ? 'https://example.com/fixture.git' : `${pkgName}@1.0.0`;

        await npm.installPackage(cwd, spec, {pkgName, installType, hasAppiumDependency: true});

        assert.strictEqual(exec.mock.callCount(), 1);
        const [command, args] = exec.mock.calls[0].arguments;
        assert.strictEqual(command, 'install');
        assert.deepStrictEqual(args, ['--save-dev', '--no-progress', '--no-audit', spec]);
      });
    }
  });

  describe('resolveFrom()', function () {
    const appiumRoot = path.join(import.meta.dirname, '..', '..', '..');

    it('should resolve a package path from a directory', async function () {
      const resolved = await resolveFrom(appiumRoot, 'semver/package.json');
      assert.match(resolved, /semver[/\\]package\.json$/);
    });

    it('should reject when the module cannot be resolved', async function () {
      await assert.rejects(resolveFrom(appiumRoot, 'nonexistent-appium-package-xyz/package.json'));
    });
  });

  describe('uninstallPackage()', function () {
    it('should disable audit while retaining the install lock', async function (t) {
      const npm = new NPM();
      const cwd = path.resolve('appium-home');
      const exec = t.mock.method(npm, 'exec', async () => ({stdout: '', stderr: '', code: 0}));

      await npm.uninstallPackage(cwd, '@appium/fake-driver');

      assert.strictEqual(exec.mock.callCount(), 1);
      const [command, args, options] = exec.mock.calls[0].arguments;
      assert.strictEqual(command, 'uninstall');
      assert.deepStrictEqual(args, ['@appium/fake-driver', '--no-audit']);
      assert.ok(options);
      assert.strictEqual(options.cwd, cwd);
      assert.ok(options.lockFile);
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

async function createInstalledPackage(t: TestContext) {
  const cwd = await fs.realpath(await tempDir.openDir());
  t.after(async () => {
    await fs.rimraf(cwd);
  });
  const pkgName = 'fixture-local-extension';
  const pkg = {name: pkgName, version: '1.0.0'};
  const installPath = path.join(cwd, 'node_modules', pkgName);
  await fs.mkdir(installPath, {recursive: true});
  await fs.writeFile(path.join(installPath, 'package.json'), JSON.stringify(pkg));
  return {cwd, pkgName, pkg, installPath};
}

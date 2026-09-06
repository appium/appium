import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {ExtManifest} from 'appium/types/index.js';

import {DRIVER_TYPE} from '../../../lib/constants.js';
import {Manifest} from '../../../lib/extension/manifest/manifest.js';
import {migrate} from '../../../lib/extension/manifest/migrations.js';

describe('manifest-migrations', function () {
  describe('when no installPath property present in manifest', function () {
    it('should trigger refresh', async function () {
      const manifest = Manifest.getInstance(process.cwd());
      // do not explicitly set the schema rev lower here, since that will trigger
      manifest.setExtension(DRIVER_TYPE, 'derp', {
        version: '1.0.0',
        automationName: 'Derp',
        mainClass: 'SomeClass',
        pkgName: 'derp',
        platformNames: ['dogs', 'cats'],
        installSpec: 'derp',
        installType: 'local',
        appiumVersion: '2.0.0',
      } as ExtManifest<'driver'>);

      assert.strictEqual(await migrate(manifest), true);
    });
  });

  describe('when installPath property present in manifest', function () {
    it('should not trigger refresh', async function () {
      const manifest = Manifest.getInstance(process.cwd());
      // do not explicitly set the schema rev lower here, since that will trigger
      manifest.setExtension(DRIVER_TYPE, 'derp', {
        version: '1.0.0',
        automationName: 'Derp',
        mainClass: 'SomeClass',
        pkgName: 'derp',
        platformNames: ['dogs', 'cats'],
        installPath: '/path/to/thing',
        installType: 'local',
        installSpec: 'derp',
        appiumVersion: '2.0.0',
      } as ExtManifest<'driver'>);

      assert.strictEqual(await migrate(manifest), false);
    });
  });

  describe('when an installType is "npm" and the rev is old', function () {
    it('should trigger refresh', async function () {
      const manifest = Manifest.getInstance(process.cwd());
      manifest.setSchemaRev(3); // this will trigger a refresh, but there's no way to tell _why_, which may be bad. YAGNI?
      manifest.setExtension(DRIVER_TYPE, 'derp', {
        version: '1.0.0',
        automationName: 'Derp',
        mainClass: 'SomeClass',
        pkgName: 'derp',
        platformNames: ['dogs', 'cats'],
        installType: 'npm',
        installPath: '/path/to/thing',
        installSpec: 'derp',
        appiumVersion: '2.0.0',
      } as ExtManifest<'driver'>);

      assert.strictEqual(await migrate(manifest), true);
    });
  });

  describe('when no installType is "npm"', function () {
    it('should not trigger refresh', async function () {
      const manifest = Manifest.getInstance(process.cwd());
      // do not explicitly set the schema rev lower here, since that will trigger
      manifest.setExtension(DRIVER_TYPE, 'derp', {
        version: '1.0.0',
        automationName: 'Derp',
        mainClass: 'SomeClass',
        pkgName: 'derp',
        platformNames: ['dogs', 'cats'],
        installType: 'local',
        installPath: '/path/to/thing',
        installSpec: 'derp',
        appiumVersion: '2.0.0',
      } as ExtManifest<'driver'>);

      assert.strictEqual(await migrate(manifest), false);
    });
  });
});

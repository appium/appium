import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, before, after} from 'node:test';

import {fs, tempDir} from '@appium/support';

import {DRIVER_TYPE, EXT_SUBCOMMAND_LIST as LIST} from '../../lib/constants.js';
import {resolveFrom} from '../../lib/utils/index.js';
import {FAKE_DRIVER_DIR, resolveFixture} from '../helpers.js';
import {installLocalExtension, runAppiumJson, writeAppiumDependentPackageJson} from './e2e-helpers.js';

describe('when Appium is a dependency of the current project', function () {
  let appiumHomePkgPath: string;
  let appiumHome: string;
  let runJson: (args: string[]) => Promise<unknown>;

  before(async function () {
    appiumHome = await tempDir.openDir();
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  describe('when the project is an extension', function () {
    before(async function () {
      appiumHome = await tempDir.openDir();
      appiumHomePkgPath = path.join(appiumHome, 'package.json');
      runJson = runAppiumJson(appiumHome);

      await fs.copyFile(resolveFixture('test-driver/package.json'), appiumHomePkgPath);
    });

    it('should automatically discover the extension', async function () {
      const res = (await runJson([DRIVER_TYPE, LIST])) as Record<string, {installed?: boolean}>;
      assert.ok(Object.hasOwn(res, 'test'));
    });
  });

  describe('when the project is not an extension', function () {
    before(async function () {
      appiumHome = await tempDir.openDir();
      appiumHomePkgPath = path.join(appiumHome, 'package.json');
      runJson = runAppiumJson(appiumHome);

      await writeAppiumDependentPackageJson(appiumHome);
    });

    describe('without drivers installed', function () {
      it('should list no drivers', async function () {
        const res = (await runJson([DRIVER_TYPE, LIST])) as Record<string, {installed?: boolean}>;
        assert.strictEqual(
          Object.values(res).every(({installed}) => !installed),
          true,
        );
      });
    });

    describe('after a driver is installed', function () {
      before(async function () {
        await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
      });

      it('should list the driver', async function () {
        const res = (await runJson([DRIVER_TYPE, LIST])) as Record<string, unknown>;
        assert.ok(Object.hasOwn(res, 'fake'));
      });

      it('should be resolvable from the local directory', async function () {
        await resolveFrom(appiumHome, '@appium/fake-driver/package.json');
      });
    });
  });
});

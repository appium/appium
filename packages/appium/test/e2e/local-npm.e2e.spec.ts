import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, before, after, beforeEach} from 'node:test';

import {fs, tempDir} from '@appium/support';
import type {ManifestData} from 'appium/types/index.js';
import * as YAML from 'yaml';

import {
  DRIVER_TYPE,
  EXT_SUBCOMMAND_INSTALL as INSTALL,
  EXT_SUBCOMMAND_LIST as LIST,
  PKG_HASHFILE_RELATIVE_PATH,
} from '../../lib/constants.js';
import {MANIFEST_RELATIVE_PATH, npm, resolveFrom} from '../../lib/utils/index.js';
import {FAKE_DRIVER_DIR, resolveFixture} from '../helpers.js';
import {installLocalExtension, runAppiumJson, writeAppiumDependentPackageJson} from './e2e-helpers.js';
const testDriverPath = path.dirname(resolveFixture('test-driver/package.json'));

describe('when Appium is a dependency of the current project', function () {
  let hashPath: string;
  let manifestPath: string;
  let appiumHomePkgPath: string;
  let appiumHome: string;
  let runJson: (args: string[]) => Promise<unknown>;

  before(async function () {
    appiumHome = await tempDir.openDir();
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  async function readManifest(): Promise<ManifestData> {
    const manifest = await fs.readFile(manifestPath, 'utf8');
    return YAML.parse(manifest) as ManifestData;
  }

  describe('when the project is not an extension', function () {
    before(async function () {
      appiumHome = await tempDir.openDir();
      hashPath = path.join(appiumHome, PKG_HASHFILE_RELATIVE_PATH);
      manifestPath = path.join(appiumHome, MANIFEST_RELATIVE_PATH);
      appiumHomePkgPath = path.join(appiumHome, 'package.json');
      runJson = runAppiumJson(appiumHome);

      await writeAppiumDependentPackageJson(appiumHome);
    });

    describe('when a driver is installed via npm', function () {
      before(async function () {
        await fs.rimraf(path.dirname(hashPath));
        // Exercise installation without waiting for the registry's audit service.
        await npm.exec(INSTALL, [FAKE_DRIVER_DIR, '--no-audit'], {
          json: true,
          cwd: appiumHome,
        });
      });

      describe(LIST, function () {
        let res: Record<string, unknown>;

        beforeEach(async function () {
          res = (await runJson([DRIVER_TYPE, LIST])) as Record<string, unknown>;
        });

        it('should list the driver', function () {
          assert.ok(Object.hasOwn(res, 'fake'));
        });

        it('should update the manifest', async function () {
          const manifestParsed = await readManifest();
          assert.ok(manifestParsed.drivers?.fake);
        });

        describe('when a different driver is installed via "appium driver install"', function () {
          before(async function () {
            await runJson([DRIVER_TYPE, LIST]);
            await installLocalExtension(appiumHome, DRIVER_TYPE, testDriverPath);
          });

          it('should update package.json', async function () {
            const newPkg = JSON.parse(await fs.readFile(appiumHomePkgPath, 'utf8'));
            assert.ok(newPkg.devDependencies?.['@appium/test-driver']);
          });

          it('should update the manifest with the new driver', async function () {
            const manifest = await fs.readFile(manifestPath, 'utf8');
            const manifestParsed = YAML.parse(manifest) as ManifestData;
            assert.ok(manifestParsed.drivers?.test);
            assert.ok(manifestParsed.drivers?.fake);
          });

          it('should actually install both drivers', async function () {
            // Resolve package.json to assert the package is present (resolving the main entry can fail in CI)
            await resolveFrom(appiumHome, '@appium/fake-driver/package.json');
            await resolveFrom(appiumHome, '@appium/test-driver/package.json');
          });
        });
      });
    });
  });
});

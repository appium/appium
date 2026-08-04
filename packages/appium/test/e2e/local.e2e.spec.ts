import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, before, after, beforeEach} from 'node:test';

import {env, fs, npm, tempDir} from '@appium/support';
import type {ManifestData} from 'appium/types';
import * as YAML from 'yaml';

import {
  DRIVER_TYPE,
  EXT_SUBCOMMAND_INSTALL as INSTALL,
  EXT_SUBCOMMAND_LIST as LIST,
  PKG_HASHFILE_RELATIVE_PATH,
} from '../../lib/constants';
import {resolveFrom} from '../../lib/utils';
import {FAKE_DRIVER_DIR, resolveFixture} from '../helpers';
import {installLocalExtension, runAppiumJson} from './e2e-helpers';

const {MANIFEST_RELATIVE_PATH} = env;
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

  describe('when the project is an extension', function () {
    before(async function () {
      appiumHome = await tempDir.openDir();
      hashPath = path.join(appiumHome, PKG_HASHFILE_RELATIVE_PATH);
      manifestPath = path.join(appiumHome, MANIFEST_RELATIVE_PATH);
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
      hashPath = path.join(appiumHome, PKG_HASHFILE_RELATIVE_PATH);
      manifestPath = path.join(appiumHome, MANIFEST_RELATIVE_PATH);
      appiumHomePkgPath = path.join(appiumHome, 'package.json');
      runJson = runAppiumJson(appiumHome);

      await fs.copyFile(resolveFixture('cli/appium-dependency.package.json'), appiumHomePkgPath);
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

    describe('when a driver is installed via npm', function () {
      before(async function () {
        await fs.rimraf(path.dirname(hashPath));
        await npm.exec(INSTALL, [FAKE_DRIVER_DIR], {
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
          assert.ok(manifestParsed.drivers?.fake !== undefined);
        });

        describe('when a different driver is installed via "appium driver install"', function () {
          before(async function () {
            await runJson([DRIVER_TYPE, LIST]);
            await installLocalExtension(appiumHome, DRIVER_TYPE, testDriverPath);
          });

          it('should update package.json', async function () {
            const newPkg = JSON.parse(await fs.readFile(appiumHomePkgPath, 'utf8'));
            assert.ok(newPkg.devDependencies?.['@appium/test-driver'] !== undefined);
          });

          it('should update the manifest with the new driver', async function () {
            const manifest = await fs.readFile(manifestPath, 'utf8');
            const manifestParsed = YAML.parse(manifest) as ManifestData;
            assert.ok(manifestParsed.drivers?.test !== undefined);
            assert.ok(manifestParsed.drivers?.fake !== undefined);
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

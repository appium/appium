// @ts-check

import path from 'path';
import {fs, tempDir, mkdirp} from '../lib';
import {
  DEFAULT_APPIUM_HOME,
  readClosestPackage,
  readPackageInDir,
  resolveAppiumHome,
  resolveManifestPath,
} from '../lib/env';

const {expect} = chai;

describe('environment', function () {
  let appiumHome;
  before(async function () {
    appiumHome = await tempDir.openDir();
  });

  beforeEach(function () {
    // all of these functions are memoized, so we need to reset them before each test.
    resolveManifestPath.cache = new Map();
    resolveAppiumHome.cache = new Map();
    readClosestPackage.cache = new Map();
    readPackageInDir.cache = new Map();
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  describe('resolution of APPIUM_HOME', function () {
    describe('when `appium` is not a package nor can be resolved from the CWD', function () {
      describe('when `APPIUM_HOME` is not present in the environment', function () {
        let oldAppiumHome;

        beforeEach(function () {
          oldAppiumHome = process.env.APPIUM_HOME;
          delete process.env.APPIUM_HOME;
        });

        afterEach(function () {
          process.env.APPIUM_HOME = oldAppiumHome;
        });

        describe('when providing no `cwd` parameter', function () {
          /**
           * **IMPORTANT:** If no `cwd` is provided, {@link resolveManifestPath `resolveManifestPath()`} call {@link resolveAppiumHome `resolveAppiumHome()`}.
           * `resolveAppiumHome` depends on the value of the current working directory ({@link process.cwd `process.cwd()`}).
           * In order to isolate these tests properly, we must create a temp dir and `chdir` to it.
           * For our purposes, we can just use the `appiumHome` we set already.
           *
           * @type {string}
           */
          let oldCwd;

          beforeEach(function () {
            oldCwd = process.cwd();
            process.chdir(appiumHome);
          });

          afterEach(function () {
            process.chdir(oldCwd);
          });

          it('should resolve to the default `APPIUM_HOME`', async function () {
            await expect(resolveAppiumHome()).to.eventually.equal(
              DEFAULT_APPIUM_HOME,
            );
          });
        });

        describe('when providing a `cwd` parameter', function () {
          it('should resolve to the default `APPIUM_HOME`', async function () {
            await expect(resolveAppiumHome(appiumHome)).to.eventually.equal(
              DEFAULT_APPIUM_HOME,
            );
          });
        });
      });

      describe('when `APPIUM_HOME` is present in the environment', function () {
        let oldAppiumHome;

        beforeEach(function () {
          oldAppiumHome = process.env.APPIUM_HOME;
          process.env.APPIUM_HOME = appiumHome;
        });

        afterEach(function () {
          process.env.APPIUM_HOME = oldAppiumHome;
        });

        describe('when providing no `cwd` parameter', function () {
          it('should resolve with `APPIUM_HOME` from env', async function () {
            await expect(resolveAppiumHome()).to.eventually.equal(
              process.env.APPIUM_HOME
            );
          });
        });

        describe('when providing an `appiumHome` parameter', function () {
          it('should resolve with `APPIUM_HOME` from env', async function () {
            await expect(resolveAppiumHome('/root')).to.eventually.equal(
              process.env.APPIUM_HOME
            );
          });
        });
      });
    });

    describe('when `appium` can be resolved from the CWD', function () {
      describe('when `appium` is not a dependency', function () {
        describe('when `appium` is not an old version', function () {
          before(async function () {
            await mkdirp(path.join(appiumHome, 'node_modules'));
            await fs.copyFile(path.join(__dirname, 'fixture', 'appium-v2-package'), path.join(appiumHome, 'node_modules', 'appium'));
          });

          after(async function () {
            await fs.rimraf(path.join(appiumHome, 'node_modules'));
          });

          it('should resolve with `appiumHome`', async function () {
            await expect(resolveAppiumHome(appiumHome)).to.eventually.equal(appiumHome);
          });
        });
      });
    });
  });
});

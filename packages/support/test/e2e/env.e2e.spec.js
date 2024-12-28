// @ts-check

import path from 'path';
import {fs, tempDir} from '../../lib';
import {
  DEFAULT_APPIUM_HOME,
  readPackageInDir,
  resolveAppiumHome,
  resolveManifestPath,
  findAppiumDependencyPackage,
} from '../../lib/env';

describe('environment', function () {
  /** @type {string} */
  let cwd;
  /** @type {string|undefined} */
  let oldEnvAppiumHome;
  let expect;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    expect = chai.expect;

    cwd = await tempDir.openDir();
  });

  beforeEach(function () {
    // all of these functions are memoized, so we need to reset them before each test.
    resolveManifestPath.cache = new Map();
    resolveAppiumHome.cache = new Map();
    findAppiumDependencyPackage.cache = new Map();
    readPackageInDir.cache = new Map();

    oldEnvAppiumHome = process.env.APPIUM_HOME;
    delete process.env.APPIUM_HOME;
  });

  after(async function () {
    await fs.rimraf(cwd);
  });

  afterEach(function () {
    process.env.APPIUM_HOME = oldEnvAppiumHome;
  });

  describe('resolution of APPIUM_HOME', function () {
    describe('when `appium` is not a package nor can be resolved from the CWD', function () {
      describe('when `APPIUM_HOME` is not present in the environment', function () {
        describe('when providing no `cwd` parameter', function () {
          /**
           * **IMPORTANT:** If no `cwd` is provided, {@linkcode resolveManifestPath} call {@linkcode resolveAppiumHome}.
           * `resolveAppiumHome` depends on the value of the current working directory ({@linkcode process.cwd }).
           * In order to isolate these tests properly, we must create a temp dir and `chdir` to it.
           * For our purposes, we can just use the `cwd` we set already.
           *
           * @type {string}
           */
          let oldCwd;

          beforeEach(function () {
            oldCwd = process.cwd();
            process.chdir(cwd);
          });

          afterEach(function () {
            process.chdir(oldCwd);
          });

          it('should resolve to the default `APPIUM_HOME`', async function () {
            await expect(resolveAppiumHome()).to.eventually.equal(DEFAULT_APPIUM_HOME);
          });
        });

        describe('when providing a `cwd` parameter', function () {
          it('should resolve to the default `APPIUM_HOME`', async function () {
            await expect(resolveAppiumHome(cwd)).to.eventually.equal(DEFAULT_APPIUM_HOME);
          });
        });
      });

      describe('when `APPIUM_HOME` is present in the environment', function () {
        beforeEach(function () {
          process.env.APPIUM_HOME = cwd;
        });

        describe('when providing no `cwd` parameter', function () {
          it('should resolve with `APPIUM_HOME` from env', async function () {
            await expect(resolveAppiumHome()).to.eventually.equal(process.env.APPIUM_HOME);
          });
        });

        describe('when providing an `cwd` parameter', function () {
          it('should resolve with `APPIUM_HOME` from env', async function () {
            await expect(resolveAppiumHome('/root')).to.eventually.equal(process.env.APPIUM_HOME);
          });
        });
      });
    });

    describe('when `appium` is not a dependency', function () {
      it('should resolve with `DEFAULT_APPIUM_HOME`', async function () {
        await expect(resolveAppiumHome(cwd)).to.eventually.equal(DEFAULT_APPIUM_HOME);
      });
    });
    describe('when `appium` is a dependency and APPIUM_HOME is unset', function () {
      beforeEach(function () {
        delete process.env.APPIUM_HOME;
      });
      describe('when `appium` is installed', function () {
        before(async function () {
          await fs.mkdirp(path.join(cwd, 'node_modules'));
        });

        after(async function () {
          await fs.rimraf(path.join(cwd, 'node_modules'));
        });

        describe('when `appium` is at the current version', function () {
          beforeEach(async function () {
            await fs.copyFile(
              path.join(__dirname, 'fixture', 'appium-v2-dependency.package.json'),
              path.join(cwd, 'package.json')
            );
            // await fs.symlink(path.join(__dirname, '..', 'appium'), path.join(cwd, 'node_modules', 'appium'), 'junction');
            await fs.copyFile(
              path.join(__dirname, 'fixture', 'appium-v2-package'),
              path.join(cwd, 'node_modules', 'appium')
            );
          });

          afterEach(async function () {
            await fs.unlink(path.join(cwd, 'package.json'));
          });

          it('should resolve with `cwd`', async function () {
            await expect(resolveAppiumHome(cwd)).to.eventually.equal(cwd);
          });
        });
        describe('when `appium` is an old version', function () {
          beforeEach(async function () {
            await fs.copyFile(
              path.join(__dirname, 'fixture', 'appium-v1-dependency.package.json'),
              path.join(cwd, 'package.json')
            );
            await fs.copyFile(
              path.join(__dirname, 'fixture', 'appium-v1-package'),
              path.join(cwd, 'node_modules', 'appium')
            );
          });

          afterEach(async function () {
            await fs.unlink(path.join(cwd, 'package.json'));
          });

          it('should resolve with `DEFAULT_APPIUM_HOME`', async function () {
            await expect(resolveAppiumHome(cwd)).to.eventually.equal(DEFAULT_APPIUM_HOME);
          });
        });
      });

      describe('when `appium` has not been installed', function () {
        describe('when `appium` dep requested is current version', function () {
          before(async function () {
            await fs.copyFile(
              path.join(__dirname, 'fixture', 'appium-v2-dependency.package.json'),
              path.join(cwd, 'package.json')
            );
          });

          after(async function () {
            await fs.unlink(path.join(cwd, 'package.json'));
          });
          it('should resolve with `cwd`', async function () {
            await expect(resolveAppiumHome(cwd)).to.eventually.equal(cwd);
          });
        });

        describe('when `appium` dep requested is an old version', function () {
          before(async function () {
            await fs.copyFile(
              path.join(__dirname, 'fixture', 'appium-v1-dependency.package.json'),
              path.join(cwd, 'package.json')
            );
          });

          after(async function () {
            await fs.unlink(path.join(cwd, 'package.json'));
          });
          it('should resolve with `DEFAULT_APPIUM_HOME`', async function () {
            await expect(resolveAppiumHome(cwd)).to.eventually.equal(DEFAULT_APPIUM_HOME);
          });
        });
      });
    });
  });
});

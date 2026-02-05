import path from 'node:path';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {fs, tempDir} from '../../lib';
import {
  DEFAULT_APPIUM_HOME,
  readPackageInDir,
  resolveAppiumHome,
  resolveManifestPath,
  findAppiumDependencyPackage,
} from '../../lib/env';

describe('environment', function () {
  let cwd: string;
  let oldEnvAppiumHome: string | undefined;

  before(async function () {
    use(chaiAsPromised);
    cwd = await tempDir.openDir();
  });

  beforeEach(function () {
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
          let oldCwd: string;

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

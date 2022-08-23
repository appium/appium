// @ts-check

import getPort from 'get-port';
import {exec} from 'teen_process';
import {npm, env, fs, tempDir, util} from '@appium/support';
import B from 'bluebird';
import path from 'path';
import resolveFrom from 'resolve-from';
import YAML from 'yaml';
import {
  DRIVER_TYPE,
  EXT_SUBCOMMAND_INSTALL as INSTALL,
  EXT_SUBCOMMAND_LIST as LIST,
  EXT_SUBCOMMAND_RUN as RUN,
  EXT_SUBCOMMAND_UNINSTALL as UNINSTALL,
  PKG_HASHFILE_RELATIVE_PATH,
  KNOWN_DRIVERS,
  PLUGIN_TYPE,
} from '../../lib/constants';
import {FAKE_DRIVER_DIR, PACKAGE_ROOT, resolveFixture} from '../helpers';
import {
  installLocalExtension,
  runAppiumJson,
  runAppiumRaw,
  readAppiumArgErrorFixture,
  formatAppiumArgErrorOutput,
  EXECUTABLE,
} from './e2e-helpers';

const {MANIFEST_RELATIVE_PATH} = env;
const {expect} = chai;

describe('CLI behavior', function () {
  /**
   * @type {string}
   */
  let appiumHome;

  const testDriverPath = path.dirname(resolveFixture('test-driver/package.json'));
  const testDriverInvalidPeerDepsPath = path.dirname(
    resolveFixture('test-driver-invalid-peer-dep/package.json')
  );

  describe('when appium is already installed', function () {
    before(async function () {
      appiumHome = await tempDir.openDir();
    });

    after(async function () {
      await fs.rimraf(appiumHome);
    });

    it('should not duplicate it as peer dependencies for drivers', async function () {
      const run = runAppiumJson(appiumHome);
      await run([DRIVER_TYPE, INSTALL, 'appium-fake-driver', '--source', 'npm']);
      await fs.exists(path.join(appiumHome, 'node_modules', 'appium')).should.eventually.be.false;
    });
  });

  describe('when appium is a dependency of the project in the current working directory', function () {
    /** @type {string} */
    let hashPath;
    /** @type {string} */
    let manifestPath;
    /** @type {string} */
    let appiumHomePkgPath;

    /**
     * Helper fn
     * @returns {Promise<ManifestData>}
     */
    async function readManifest() {
      const manifest = await fs.readFile(manifestPath, 'utf8');
      return YAML.parse(manifest);
    }

    /**
     * Helper fn
     * @returns {Promise<string>}
     */
    async function readHash() {
      return await fs.readFile(hashPath, 'utf8');
    }

    /**
     * @template {CliExtensionSubcommand} ExtSubcommand
     * @type {import('lodash').CurriedFunction1<CliExtArgs<ExtSubcommand> | CliArgs, Promise<unknown>>}
     */
    let runJson;

    before(async function () {
      appiumHome = await tempDir.openDir();
      hashPath = path.join(appiumHome, PKG_HASHFILE_RELATIVE_PATH);
      manifestPath = path.join(appiumHome, MANIFEST_RELATIVE_PATH);
      appiumHomePkgPath = path.join(appiumHome, 'package.json');
      runJson = runAppiumJson(appiumHome);
      // an example package.json referencing appium dependency
      await fs.copyFile(resolveFixture('cli/appium-dependency.package.json'), appiumHomePkgPath);
    });

    after(async function () {
      await fs.rimraf(appiumHome);
    });

    describe('without drivers installed', function () {
      it('should list no drivers', async function () {
        const res = /** @type {ExtensionListData} */ (await runJson([DRIVER_TYPE, LIST]));
        res.should.satisfy(
          /** @param {typeof res} value */ (value) =>
            Object.values(value).every(({installed}) => !installed)
        );
      });
    });

    describe('after a driver is installed', function () {
      before(async function () {
        await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
      });

      it('should list the driver', async function () {
        const res = /** @type {ExtensionListData} */ (await runJson([DRIVER_TYPE, LIST]));
        res.should.have.property('fake');
      });

      it('should be resolvable from the local directory', function () {
        (() => resolveFrom(appiumHome, '@appium/fake-driver/package.json')).should.not.throw();
      });
    });

    describe('when a driver is installed via npm', function () {
      before(async function () {
        // remove the hash file and the manifest to start clean.
        // this leaves any previously-installed extension in place, which should make this a little faster.
        await fs.rimraf(path.dirname(hashPath));
        await npm.exec(INSTALL, [FAKE_DRIVER_DIR], {
          json: true,
          cwd: appiumHome,
        });
      });

      describe(LIST, function () {
        /** @type {ExtensionListData} */
        let res;

        beforeEach(async function () {
          res = /** @type {ExtensionListData} */ (await runJson([DRIVER_TYPE, LIST]));
        });
        it('should list the driver', function () {
          res.should.have.property('fake');
        });

        it('should update the manifest', async function () {
          const manifestParsed = await readManifest();
          manifestParsed.should.have.nested.property('drivers.fake');
        });

        it('should update the package hash', async function () {
          (await fs.exists(hashPath)).should.be.true;
        });
      });

      describe('when a different driver is installed via "appium driver install"', function () {
        /** @type {string} */
        let oldHash;

        before(async function () {
          await runJson([DRIVER_TYPE, LIST]);
          oldHash = await readHash();
          await installLocalExtension(appiumHome, DRIVER_TYPE, testDriverPath);
        });

        it('should update package.json', async function () {
          const newPkg = JSON.parse(await fs.readFile(appiumHomePkgPath, 'utf8'));
          expect(newPkg).to.have.nested.property('devDependencies.@appium/test-driver');
        });

        it('should update the hash', async function () {
          const newHash = await readHash();
          newHash.should.not.equal(oldHash);
        });

        it('should update the manifest with the new driver', async function () {
          const manifest = await fs.readFile(manifestPath, 'utf8');
          /** @type {ManifestData} */
          const manifestParsed = YAML.parse(manifest);
          manifestParsed.should.have.nested.property('drivers.test');
          manifestParsed.should.have.nested.property('drivers.fake');
        });

        it('should actually install both drivers', function () {
          expect(() => resolveFrom(appiumHome, '@appium/fake-driver')).not.to.throw;
          expect(() => resolveFrom(appiumHome, '@appium/test-driver')).not.to.throw;
        });
      });
    });
  });

  describe('Extension Commands', function () {
    /**
     * @type {(args?: string[]) => Promise<ExtensionListData>}
     */
    let runList;

    /**
     * @type {(args: string[]) => Promise<{ output: string, error?: string }>}
     */
    let runRun;

    before(async function () {
      appiumHome = await tempDir.openDir();
    });

    after(async function () {
      await fs.rimraf(appiumHome);
    });

    async function clear() {
      await fs.rimraf(appiumHome);
      await fs.mkdirp(appiumHome);
    }

    describe('Driver CLI', function () {
      /**
       * @type {(args: string[]) => Promise<ExtRecord<DriverType>>}
       */
      let runInstall;

      /**
       * @type {(args: string[]) => Promise<ExtRecord<DriverType>>}
       */
      let runUninstall;

      before(function () {
        const run = runAppiumJson(appiumHome);
        runInstall = async (args) =>
          /** @type {ReturnType<typeof runInstall>} */ (await run([DRIVER_TYPE, INSTALL, ...args]));
        runUninstall = async (args) =>
          /** @type {ReturnType<typeof runUninstall>} */ (
            await run([DRIVER_TYPE, UNINSTALL, ...args])
          );
        runList = async (args = []) =>
          /** @type {ReturnType<typeof runList>} */ (await run([DRIVER_TYPE, LIST, ...args]));
        runRun = async (args) =>
          /** @type {ReturnType<typeof runRun>} */ (await run([DRIVER_TYPE, RUN, ...args]));
      });

      describe(LIST, function () {
        it('should list available drivers', async function () {
          // note this is raw, not json
          const {stderr} = await runAppiumRaw(appiumHome, [DRIVER_TYPE, LIST], {});
          for (const d of Object.keys(KNOWN_DRIVERS)) {
            stderr.should.match(new RegExp(`${d}.+[not installed]`));
          }
        });
        it('should list available drivers in json format', async function () {
          const driverData = await runList();
          for (const d of Object.keys(KNOWN_DRIVERS)) {
            driverData[d].should.eql({
              installed: false,
              pkgName: KNOWN_DRIVERS[d],
            });
          }
        });
        it('should allow filtering by installed drivers', async function () {
          const out = await runList(['--installed']);
          out.should.eql({});
        });
        it('should show updates for installed drivers with --updates', async function () {
          const penultimateFakeDriverVersionAsOfRightNow = '3.0.4';
          await clear();
          await runInstall([
            `@appium/fake-driver@${penultimateFakeDriverVersionAsOfRightNow}`,
            '--source',
            'npm',
          ]);
          const {fake} =
            /** @type {Record<string,import('appium/lib/cli/extension-command').InstalledExtensionListData>} */ (
              await runList(['--updates'])
            );
          util.compareVersions(
            fake.updateVersion,
            '>',
            penultimateFakeDriverVersionAsOfRightNow
          ).should.be.true;
          // TODO: this could probably be replaced by looking at updateVersion in the JSON
          const {stderr} = await runAppiumRaw(appiumHome, [DRIVER_TYPE, LIST, '--updates'], {});
          stderr.should.match(new RegExp(`fake.+[${fake.updateVersion} available]`));
        });

        describe('if a driver is not published to npm', function () {
          it('should not throw an error', async function () {
            await clear();
            await installLocalExtension(appiumHome, DRIVER_TYPE, testDriverPath);
            await expect(runList(['--updates'])).not.to.be.rejected;
          });
        });
      });

      describe(INSTALL, function () {
        beforeEach(async function () {
          await clear();
        });

        it('should install a driver from the list of known drivers', async function () {
          const ret = await runInstall(['uiautomator2']);
          ret.uiautomator2.pkgName.should.eql('appium-uiautomator2-driver');
          ret.uiautomator2.installType.should.eql('npm');
          ret.uiautomator2.installSpec.should.eql('uiautomator2');
          const list = await runList(['--installed']);
          delete list.uiautomator2.installed;
          list.should.eql(ret);
        });
        it('should install a driver from npm', async function () {
          const ret = await runInstall(['@appium/fake-driver', '--source', 'npm']);
          ret.fake.pkgName.should.eql('@appium/fake-driver');
          ret.fake.installType.should.eql('npm');
          ret.fake.installSpec.should.eql('@appium/fake-driver');
          const list = await runList(['--installed']);
          delete list.fake.installed;
          list.should.eql(ret);
        });

        it('should install a driver from npm and a local driver', async function () {
          await runInstall(['@appium/fake-driver', '--source', 'npm']);
          await installLocalExtension(appiumHome, DRIVER_TYPE, testDriverPath);
          const list = await runList(['--installed']);
          expect(list.fake).to.exist;
          expect(list.test).to.exist;
          expect(() => resolveFrom(appiumHome, '@appium/fake-driver')).not.to.throw;
          expect(() => resolveFrom(appiumHome, 'test-driver')).not.to.throw;
        });

        it('should install _two_ drivers from npm', async function () {
          await runInstall(['@appium/fake-driver', '--source', 'npm']);
          await runInstall(['appium-uiautomator2-driver', '--source', 'npm']);
          const list = await runList(['--installed']);
          expect(list.fake).to.exist;
          expect(list.uiautomator2).to.exist;
          expect(() => resolveFrom(appiumHome, '@appium/fake-driver')).not.to.throw;
          expect(() => resolveFrom(appiumHome, 'appium-uiautomator2-driver')).not.to.throw;
        });

        it('should install a driver from npm with a specific version/tag', async function () {
          const currentFakeDriverVersionAsOfRightNow = '3.0.5';
          const installSpec = `@appium/fake-driver@${currentFakeDriverVersionAsOfRightNow}`;
          const ret = await runInstall([installSpec, '--source', 'npm']);
          ret.fake.pkgName.should.eql('@appium/fake-driver');
          ret.fake.installType.should.eql('npm');
          ret.fake.installSpec.should.eql(installSpec);
          const list = await runList(['--installed']);
          delete list.fake.installed;
          list.should.eql(ret);
        });
        it('should install a driver from github', async function () {
          const ret = await runInstall([
            'appium/appium-fake-driver',
            '--source',
            'github',
            '--package',
            'appium-fake-driver',
          ]);
          ret.fake.pkgName.should.eql('appium-fake-driver');
          ret.fake.installType.should.eql('github');
          ret.fake.installSpec.should.eql('appium/appium-fake-driver');
          const list = await runList(['--installed']);
          delete list.fake.installed;
          list.should.eql(ret);
        });
        it('should install a driver from a local git repo', async function () {
          const ret = await runInstall([
            FAKE_DRIVER_DIR,
            '--source',
            'git',
            '--package',
            '@appium/fake-driver',
          ]);
          ret.fake.pkgName.should.eql('@appium/fake-driver');
          ret.fake.installType.should.eql('git');
          ret.fake.installSpec.should.eql(FAKE_DRIVER_DIR);
          const list = await runList(['--installed', '--json']);
          delete list.fake.installed;
          list.should.eql(ret);
        });
        it('should install a driver from a remote git repo', async function () {
          const ret = await runInstall([
            'git+https://github.com/appium/appium-fake-driver.git',
            '--source',
            'git',
            '--package',
            'appium-fake-driver',
          ]);
          ret.fake.pkgName.should.eql('appium-fake-driver');
          ret.fake.installType.should.eql('git');
          ret.fake.installSpec.should.eql('git+https://github.com/appium/appium-fake-driver');
          const list = await runList(['--installed']);
          delete list.fake.installed;
          list.should.eql(ret);
        });
        it('should install a driver from a local npm module', async function () {
          // take advantage of the fact that we know we have fake driver installed as a dependency in
          // this module, so we know its local path on disk
          const ret = await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
          ret.fake.pkgName.should.eql('@appium/fake-driver');
          ret.fake.installType.should.eql('local');
          ret.fake.installSpec.should.eql(FAKE_DRIVER_DIR);
          const list = await runList(['--installed']);
          delete list.fake.installed;
          list.should.eql(ret);

          // it should be a link!  this may be npm-version dependent, but it's worked
          // this way for quite awhile
          const stat = await fs.lstat(
            path.join(appiumHome, 'node_modules', '@appium', 'fake-driver')
          );
          expect(stat.isSymbolicLink()).to.be.true;
        });

        describe('when peer dependencies are invalid', function () {
          it('should install the driver anyway', async function () {
            const ret = await installLocalExtension(
              appiumHome,
              DRIVER_TYPE,
              testDriverInvalidPeerDepsPath
            );
            ret.test.pkgName.should.equal('test-driver-invalid-peer-dep');
            const list = await runList(['--installed']);
            list.test.pkgName.should.equal('test-driver-invalid-peer-dep');
          });

          it('should warn the user that peer deps are invalid', async function () {
            const ret = await runAppiumRaw(
              appiumHome,
              [DRIVER_TYPE, INSTALL, '--source', 'local', testDriverInvalidPeerDepsPath],
              {}
            );
            ret.stderr.should.match(/may be incompatible with the current version of Appium/i);
            ret.stderr.should.match(/successfully installed/i);
          });
        });

        describe('when peer dependencies are valid', function () {
          it('should not display a warning', async function () {
            const ret = await runAppiumRaw(
              appiumHome,
              [DRIVER_TYPE, INSTALL, '--source', 'local', testDriverPath],
              {}
            );
            ret.stderr.should.not.match(/may be incompatible with the current version of Appium/i);
            ret.stderr.should.match(/successfully installed/i);
          });
        });
      });

      describe('uninstall', function () {
        it('should uninstall a driver based on its driver name', async function () {
          const ret = await runInstall(['@appium/fake-driver', '--source', 'npm']);
          // this will throw if the file doesn't exist
          const installPath = resolveFrom(appiumHome, ret.fake.pkgName);
          let list = await runList(['--installed']);
          list.fake.installed.should.be.true;
          const uninstall = await runUninstall(['fake']);
          uninstall.should.not.have.key('fake');
          await fs.exists(installPath).should.eventually.be.false;
        });
      });

      describe('run', function () {
        const driverName = 'fake';
        before(async function () {
          await clear();
          await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
        });

        describe('when the driver and script is valid', function () {
          const scriptName = 'fake-success';

          describe('when the script completes successfully', function () {
            it('should result in success', async function () {
              const out = await runRun([driverName, scriptName]);
              out.should.not.have.property('error');
            });
          });

          describe('when the script fails', function () {
            it('should return an error', async function () {
              const out = await runRun([driverName, 'fake-error']);
              out.should.have.property('error');
            });
          });

          describe('when passed extra arguments', function () {
            it('should pass them to the script', async function () {
              const out = await runRun([driverName, scriptName, '--foo', '--bar']);
              out.should.not.have.property('error');
              out.output.should.match(/--foo --bar/);
            });
          });
        });

        describe('when the driver is valid but the script is not', function () {
          it('should throw an error', async function () {
            await expect(runRun([driverName, 'foo'])).to.be.rejectedWith(Error);
          });
        });

        describe('when the driver and script are invalid', function () {
          it('should throw an error', async function () {
            const driverName = 'foo';
            await expect(runRun([driverName, 'bar'])).to.be.rejectedWith(Error);
          });
        });
      });
    });

    describe('Plugin CLI', function () {
      const FAKE_PLUGIN_DIR = path.dirname(require.resolve('@appium/fake-plugin/package.json'));

      before(function () {
        const run = runAppiumJson(appiumHome);
        runList = async (args = []) =>
          /** @type {ReturnType<typeof runList>} */ (await run([PLUGIN_TYPE, LIST, ...args]));
        runRun = async (args) =>
          /** @type {ReturnType<typeof runRun>} */ (await run([PLUGIN_TYPE, RUN, ...args]));
      });

      describe('run', function () {
        before(async function () {
          await clear();
          await installLocalExtension(appiumHome, PLUGIN_TYPE, FAKE_PLUGIN_DIR);
        });
        it('should run a valid plugin, valid script, and result in success', async function () {
          const pluginName = 'fake';
          const scriptName = 'fake-success';
          const out = await runRun([pluginName, scriptName, '--json']);
          out.should.not.have.property('error');
        });
        it('should run a valid plugin, valid error prone script, and return error in json', async function () {
          const pluginName = 'fake';
          const out = await runRun([pluginName, 'fake-error', '--json']);
          out.should.have.property('error');
        });
        it('should take a valid plugin, invalid script, and throw an error', async function () {
          const pluginName = 'fake';
          await expect(runRun([pluginName, 'foo', '--json'])).to.be.rejectedWith(Error);
        });
        it('should take an invalid plugin, invalid script, and throw an error', async function () {
          await expect(runRun(['foo', 'bar', '--json'])).to.be.rejectedWith(Error);
        });
      });
    });
  });

  describe('argument parsing', function () {
    describe('when the user provides a very long string for an arg accepting a blob or filename', function () {
      describe('when the very long string is a JSON blob', function () {
        it('should not throw an ENAMETOOLONG exception', async function () {
          this.timeout(10000);
          const capsArg = JSON.stringify({
            'appium:platformName': 'ANDROID',
            'appium:platformVersion': '11',
            'appium:deviceName':
              'Spicy jalapeno bacon ipsum dolor amet deserunt tempor pork belly aliqua drumstick, occaecat dolor venison et labore. Rump meatball pork chop tail. Consequat adipisicing kielbasa occaecat laborum pig. Qui pork chop chicken nostrud boudin fugiat. Proident ut culpa, chuck nulla sunt pastrami ut tri-tip. Buffalo dolore adipisicing, labore venison elit beef fatback kevin burgdoggen tail pancetta filet mignon. Dolor turducken rump, anim kevin sunt exercitation ham filet mignon beef ribs ad officia eiusmod id cillum.',
          });

          await expect(
            exec(
              process.execPath,
              [
                EXECUTABLE,
                '-pa=/wd/hub',
                '--session-override',
                '--local-timezone',
                '--relaxed-security',
                `--default-capabilities=${capsArg}`,
                '--port',
                await getPort(),
              ],
              {
                env: {APPIUM_HOME: appiumHome, PATH: process.env.PATH},
                cwd: PACKAGE_ROOT,
                timeout: 5000,
              }
            )
          ).to.be.rejectedWith(Error, /timed out/);
        });
      });
    });
    describe('when the user provides an string where a number was expected', function () {
      describe('when color output is supported', function () {
        it('should output a fancy error message', async function () {
          const [{stderr: actual}, expected] = await B.all([
            runAppiumRaw(appiumHome, ['--port=sheep'], {
              env: {FORCE_COLOR: '1'},
            }),
            readAppiumArgErrorFixture('cli/cli-error-output-color.txt'),
          ]);
          expect(formatAppiumArgErrorOutput(actual)).to.equal(expected);
        });
      });

      describe('when color output is unsupported', function () {
        it('should output a colorless yet fancy error message', async function () {
          const [{stderr: actual}, expected] = await B.all([
            runAppiumRaw(appiumHome, ['--port=sheep'], {}),
            readAppiumArgErrorFixture('cli/cli-error-output.txt'),
          ]);
          expect(formatAppiumArgErrorOutput(actual)).to.equal(expected);
        });
      });
    });

    describe('when the user provides a value for a boolean argument', function () {
      it('should output a basic error message', async function () {
        const [{stderr: actual}, expected] = await B.all([
          runAppiumRaw(appiumHome, ['--relaxed-security=sheep'], {}),
          readAppiumArgErrorFixture('cli/cli-error-output-boolean.txt'),
        ]);
        expect(formatAppiumArgErrorOutput(actual)).to.equal(expected);
      });
    });

    describe('when the user provides an unknown argument', function () {
      it('should output a basic error message', async function () {
        const [{stderr: actual}, expected] = await B.all([
          runAppiumRaw(appiumHome, ['--pigs=sheep'], {}),
          readAppiumArgErrorFixture('cli/cli-error-output-unknown.txt'),
        ]);
        expect(formatAppiumArgErrorOutput(actual)).to.equal(expected);
      });
    });
  });
});

/**
 * @typedef {import('@appium/types').ExtensionType} ExtensionType
 * @typedef {import('appium/types').ManifestData} ManifestData
 * @typedef {import('@appium/types').DriverType} DriverType
 * @typedef {import('@appium/types').PluginType} PluginType
 * @typedef {import('appium/lib/cli/extension-command').ExtensionListData} ExtensionListData
 * @typedef {import('./e2e-helpers').CliArgs} CliArgs
 * @typedef {import('appium/types').CliExtensionSubcommand} CliExtensionSubcommand
 */

/**
 * @template ExtSubCommand
 * @typedef {import('./e2e-helpers').CliExtArgs<ExtSubCommand>} CliExtArgs
 */

/**
 * @template T
 * @typedef {import('appium/types').ExtRecord<T>} ExtRecord
 */

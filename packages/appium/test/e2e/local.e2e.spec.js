// @ts-check

import {env, fs, npm, tempDir} from '@appium/support';
import path from 'node:path';
import resolveFrom from 'resolve-from';
import YAML from 'yaml';
import {
  DRIVER_TYPE,
  EXT_SUBCOMMAND_INSTALL as INSTALL,
  EXT_SUBCOMMAND_LIST as LIST,
  PKG_HASHFILE_RELATIVE_PATH,
} from '../../lib/constants';
import {FAKE_DRIVER_DIR, resolveFixture} from '../helpers.cjs';
import {installLocalExtension, runAppiumJson} from './e2e-helpers';

const {MANIFEST_RELATIVE_PATH} = env;
const testDriverPath = path.dirname(resolveFixture('test-driver/package.json'));

describe('when Appium is a dependency of the current project', function () {
  /** @type {string} */
  let hashPath;
  /** @type {string} */
  let manifestPath;
  /** @type {string} */
  let appiumHomePkgPath;
  /** @type {string} */
  let appiumHome;
  let expect;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    expect = chai.expect;

    appiumHome = await tempDir.openDir();
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  /**
   * Helper fn
   * @returns {Promise<ManifestData>}
   */
  async function readManifest() {
    const manifest = await fs.readFile(manifestPath, 'utf8');
    return YAML.parse(manifest);
  }

  /**
   * @template {CliExtensionSubcommand} ExtSubcommand
   * @type {import('lodash').CurriedFunction1<CliExtArgs<ExtSubcommand> | CliArgs, Promise<unknown>>}
   */
  let runJson;

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
      const res = await runJson([DRIVER_TYPE, LIST]);
      expect(res).to.have.property('test');
    });
  });

  describe('when the project is not an extension', function () {
    before(async function () {
      appiumHome = await tempDir.openDir();
      hashPath = path.join(appiumHome, PKG_HASHFILE_RELATIVE_PATH);
      manifestPath = path.join(appiumHome, MANIFEST_RELATIVE_PATH);
      appiumHomePkgPath = path.join(appiumHome, 'package.json');
      runJson = runAppiumJson(appiumHome);

      // an example package.json referencing appium dependency
      await fs.copyFile(resolveFixture('cli/appium-dependency.package.json'), appiumHomePkgPath);
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

        describe('when a different driver is installed via "appium driver install"', function () {
          before(async function () {
            await runJson([DRIVER_TYPE, LIST]);
            await installLocalExtension(appiumHome, DRIVER_TYPE, testDriverPath);
          });

          it('should update package.json', async function () {
            const newPkg = JSON.parse(await fs.readFile(appiumHomePkgPath, 'utf8'));
            expect(newPkg).to.have.nested.property('devDependencies.@appium/test-driver');
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
  });
});

/**
 * @typedef {import('appium/types').ManifestData} ManifestData
 * @typedef {import('./e2e-helpers').CliArgs} CliArgs
 * @typedef {import('appium/lib/cli/extension-command').ExtensionListData} ExtensionListData
 * @typedef {import('appium/types').CliExtensionSubcommand} CliExtensionSubcommand
 */

/**
 * @template ExtSubCommand
 * @typedef {import('./e2e-helpers').CliExtArgs<ExtSubCommand>} CliExtArgs
 */

import {fs, tempDir} from '@appium/support';
import path from 'node:path';
import YAML from 'yaml';
import {
  CACHE_DIR_RELATIVE_PATH,
  CURRENT_SCHEMA_REV,
  DRIVER_TYPE,
  EXT_SUBCOMMAND_LIST as LIST,
  EXT_SUBCOMMAND_UNINSTALL as UNINSTALL,
} from '../../lib/constants';
import {INITIAL_MANIFEST_DATA} from '../../lib/extension/manifest';
import {FAKE_DRIVER_DIR, resolveFixture} from '../helpers';
import {installLocalExtension, runAppiumJson, runAppiumRaw} from './e2e-helpers';

const {expect} = chai;

describe('manifest handling', function () {
  /**
   * @type {string}
   */
  let appiumHome;

  /**
   * @type {string}
   */
  let manifestPath;

  /**
   * @type {(args?: string[]) => Promise<ExtensionListData>}
   */
  let runDriverList;

  /**
   * @type {(args: string[]) => Promise<ExtRecord<DriverType>>}
   */
  let runDriverUninstall;

  async function resetAppiumHome() {
    await fs.rimraf(appiumHome);
    await fs.mkdirp(appiumHome);
  }

  before(async function () {
    appiumHome = await tempDir.openDir();
    manifestPath = path.join(appiumHome, CACHE_DIR_RELATIVE_PATH, 'extensions.yaml');
    const run = runAppiumJson(appiumHome);
    runDriverList = async (args = []) =>
      /** @type {ReturnType<typeof runDriverList>} */ (await run([DRIVER_TYPE, LIST, ...args]));
    runDriverUninstall = async (args) =>
      /** @type {ReturnType<typeof runDriverUninstall>} */ (
        await run([DRIVER_TYPE, UNINSTALL, ...args])
      );
  });

  /**
   * @returns {Promise<import('appium/types').AnyManifestDataVersion>}
   */
  async function readManifest() {
    return YAML.parse(await fs.readFile(manifestPath, 'utf8'));
  }

  async function deleteManifest() {
    await fs.rimraf(manifestPath);
  }

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  describe('when no manifest file exists', function () {
    describe('when no extensions are installed', function () {
      beforeEach(async function () {
        await resetAppiumHome();
      });

      it('should create an empty manifest with the latest revision', async function () {
        await expect(readManifest()).to.be.rejected;
        await runDriverList();
        await expect(readManifest()).to.eventually.eql(INITIAL_MANIFEST_DATA);
      });
    });

    describe('when extensions are already installed', function () {
      /** @type {string} */
      let stderr;

      before(async function () {
        // get a clean dir, install fake driver, then delete the manifest file so we have no record of it.
        await resetAppiumHome();
        await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
        await expect(readManifest()).to.eventually.have.nested.property('drivers.fake');
        await deleteManifest();
        ({stderr} = await runAppiumRaw(appiumHome, [DRIVER_TYPE, LIST], {}));
      });

      it('should discover installed extensions', async function () {
        const manifest = await readManifest();

        expect(manifest.drivers.fake).to.exist;
        expect(manifest.plugins).to.be.empty;
        expect(manifest.schemaRev).to.equal(CURRENT_SCHEMA_REV);
      });

      it('should tell the user a new extension was found', function () {
        expect(stderr).to.include('Discovered installed driver "fake"');
      });
    });
  });

  describe('uninstallation of extensions', function () {
    before(async function () {
      await resetAppiumHome();
      await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
      await runDriverUninstall(['fake']);
    });

    it('should remove the extension from the manifest', async function () {
      await expect(readManifest()).to.eventually.eql(INITIAL_MANIFEST_DATA);
    });
  });

  describe('migration', function () {
    beforeEach(async function () {
      await resetAppiumHome();
      await fs.mkdirp(path.dirname(manifestPath));
    });

    describe('schema rev update', function () {
      beforeEach(async function () {
        await fs.copyFile(resolveFixture('manifest/v2-empty.yaml'), manifestPath);
      });

      it('should update the manifest file to the latest schema revision', async function () {
        // note: all we need to do to run the migration is invoke appium, so any command
        // would do.
        await runDriverList();
        const manifest = await readManifest();
        expect(manifest.schemaRev).to.equal(CURRENT_SCHEMA_REV);
      });
    });

    describe('v3', function () {
      /** @type {import('appium/types').AnyManifestDataVersion} */
      let manifest;
      // for these tests, we have to use a real extension, because the migration
      // only does anything if the extension is actually installed.
      before(async function () {
        await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
        const list = await runDriverList();
        expect(list.fake).to.exist;

        // but the manifest is now at v3, since it's brand new. we will manually downgrade.
        let tmpManifest = await readManifest();
        tmpManifest.schemaRev = 2;
        delete tmpManifest.drivers.fake.installPath;
        await fs.writeFile(manifestPath, YAML.stringify(tmpManifest));
        tmpManifest = await readManifest();
        expect(tmpManifest.schemaRev).to.equal(2);
        expect(tmpManifest.drivers.fake.installPath).to.not.exist;
        await runDriverList();
        manifest = await readManifest();
      });

      it('should add an "installPath" field to each extension', function () {
        expect(manifest.drivers.fake?.installPath).to.be.a('string');
      });

      it('should update the manifest file to the latest schema revision', function () {
        expect(manifest.schemaRev).to.equal(CURRENT_SCHEMA_REV);
      });
    });
  });

  describe('sync installed extensions', function () {
    beforeEach(async function () {
      await resetAppiumHome();
      // appium usually creates this, but we're going to use a custom fixture
      await fs.mkdirp(path.dirname(manifestPath));
    });

    describe('when the manifest is current', function () {
      it('should not sync extensions', async function () {
        await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
        await fs.copyFile(resolveFixture('manifest/current-empty.yaml'), manifestPath);
        await runDriverList();
        await expect(readManifest()).to.eventually.eql(INITIAL_MANIFEST_DATA);
      });
    });

    describe('when the manifest needs migration', function () {
      describe('when the manifest contains missing extensions', function () {
        /** @type {string} */
        let stderr;

        beforeEach(async function () {
          await fs.copyFile(resolveFixture('manifest/v2.yaml'), manifestPath);

          // prove that the manifest contains the extensions in the first place!
          const manifest = await readManifest();
          expect(manifest.drivers.fake).to.exist;
          expect(manifest.plugins.fake).to.exist;

          ({stderr} = await runAppiumRaw(appiumHome, [DRIVER_TYPE, LIST], {}));
        });

        it('should remove the missing extensions', async function () {
          const manifest = await readManifest();
          expect(manifest.drivers.fake).to.not.exist;
          expect(manifest.plugins.fake).to.not.exist;
        });

        it('should log warnings', function () {
          expect(stderr).to.include(
            'Removing reference to 1 driver in the manifest that could not be found on disk: fake'
          );
          expect(stderr).to.include(
            'Removing reference to 1 plugin in the manifest that could not be found on disk: fake'
          );
        });
      });
    });
  });
});

/**
 * @typedef {import('@appium/types').DriverType} DriverType
 */

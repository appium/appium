import {fs, tempDir} from '@appium/support';
import path from 'node:path';
import * as YAML from 'yaml';
import {
  CACHE_DIR_RELATIVE_PATH,
  CURRENT_SCHEMA_REV,
  DRIVER_TYPE,
  EXT_SUBCOMMAND_LIST as LIST,
} from '../../lib/constants';
import {FAKE_DRIVER_DIR, resolveFixture} from '../helpers';
import {installLocalExtension, runAppiumJson} from './e2e-helpers';

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
  let runList;
  let expect;

  async function resetAppiumHome() {
    await fs.rimraf(appiumHome);
    await fs.mkdirp(appiumHome);
  }

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    expect = chai.expect;

    appiumHome = await tempDir.openDir();
    manifestPath = path.join(appiumHome, CACHE_DIR_RELATIVE_PATH, 'extensions.yaml');
    const run = runAppiumJson(appiumHome);
    runList = async (args = []) =>
      /** @type {ReturnType<typeof runList>} */ (await run([DRIVER_TYPE, LIST, ...args]));
  });

  /**
   * @returns {Promise<import('appium/types').AnyManifestDataVersion>}
   */
  async function readManifest() {
    return YAML.parse(await fs.readFile(manifestPath, 'utf8'));
  }

  after(async function () {
    await fs.rimraf(appiumHome);
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
        await runList();
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
        const list = await runList();
        expect(list.fake).to.exist;

        // but the manifest is now at v3, since it's brand new. we will manually downgrade.
        let tmpManifest = await readManifest();
        tmpManifest.schemaRev = 2;
        delete tmpManifest.drivers.fake.installPath;
        await fs.writeFile(manifestPath, YAML.stringify(tmpManifest));
        tmpManifest = await readManifest();
        expect(tmpManifest.schemaRev).to.equal(2);
        expect(tmpManifest.drivers.fake.installPath).to.not.exist;
        await runList();
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
});

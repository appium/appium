import {resolveFixture} from '../helpers';
import YAML from 'yaml';
import {runAppiumJson} from './e2e-helpers';
import {fs, tempDir} from '@appium/support';
import {
  CACHE_DIR_RELATIVE_PATH,
  CURRENT_SCHEMA_REV,
  DRIVER_TYPE,
  EXT_SUBCOMMAND_LIST as LIST,
} from '../../lib/constants';
import path from 'node:path';

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
  let runList;

  async function resetAppiumHome() {
    await fs.rimraf(appiumHome);
    await fs.mkdirp(appiumHome);
  }

  before(async function () {
    appiumHome = await tempDir.openDir();
    manifestPath = path.join(appiumHome, CACHE_DIR_RELATIVE_PATH, 'extensions.yaml');
    const run = runAppiumJson(appiumHome);
    runList = async (args = []) =>
      /** @type {ReturnType<typeof runList>} */ (await run([DRIVER_TYPE, LIST, ...args]));
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  describe('migration', function () {
    beforeEach(async function () {
      await resetAppiumHome();
      await fs.mkdirp(path.dirname(manifestPath));
      await fs.copyFile(resolveFixture('manifest/v2-empty.yaml'), manifestPath);
    });

    it('should update the manifest file to the latest schema revision', async function () {
      await runList();
      const manifest = YAML.parse(await fs.readFile(manifestPath, 'utf8'));
      expect(manifest.schemaRev).to.equal(CURRENT_SCHEMA_REV);
    });
  });
});

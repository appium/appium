// @ts-check

import {fs, tempDir} from '@appium/support';
import {EXT_SUBCOMMAND_RUN as RUN, PLUGIN_TYPE} from '../../lib/constants';
import {FAKE_PLUGIN_DIR} from '../helpers';
import {installLocalExtension, runAppiumJson} from './e2e-helpers';

const {expect} = chai;

describe('Plugin CLI', function () {
  /**
   * @type {string}
   */
  let appiumHome;

  /**
   * @type {(args: string[]) => Promise<{ output: string, error?: string }>}
   */
  let runRun;

  before(async function () {
    appiumHome = await tempDir.openDir();
    const run = runAppiumJson(appiumHome);
    runRun = async (args) =>
      /** @type {ReturnType<typeof runRun>} */ (await run([PLUGIN_TYPE, RUN, ...args]));
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  describe('run', function () {
    before(async function () {
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

/**
 * @typedef {import('@appium/types').ExtensionType} ExtensionType
 * @typedef {import('appium/types').ManifestData} ManifestData
 * @typedef {import('@appium/types').DriverType} DriverType
 * @typedef {import('@appium/types').PluginType} PluginType
 * @typedef {import('appium/lib/cli/extension-command').ExtensionList} ExtensionListData
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

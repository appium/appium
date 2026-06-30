import {fs, tempDir} from '@appium/support';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {EXT_SUBCOMMAND_RUN as RUN, PLUGIN_TYPE} from '../../lib/constants';
import {FAKE_PLUGIN_DIR} from '../helpers';
import {installLocalExtension, runAppiumJson} from './e2e-helpers';

const {expect} = chai;
chai.use(chaiAsPromised);

describe('Plugin CLI', function () {
  let appiumHome: string;
  let runRun: (args: string[]) => Promise<{output: string; error?: string}>;

  before(async function () {
    appiumHome = await tempDir.openDir();
    const run = runAppiumJson(appiumHome);
    runRun = (args) => run([PLUGIN_TYPE, RUN, ...args]) as Promise<{output: string; error?: string}>;
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
      expect(out).to.not.have.property('error');
    });

    it('should run a valid plugin, valid error prone script, and throw error', async function () {
      const pluginName = 'fake';
      await expect(runRun([pluginName, 'fake-error', '--json'])).to.be.rejectedWith(Error);
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

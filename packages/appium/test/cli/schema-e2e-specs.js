// @ts-check
import path from 'path';
import {fs, tempDir} from '@appium/support';
import {installExtension, runAppium} from './cli-helpers';

const {expect} = chai;

describe('CLI behavior controlled by schema', function () {
  /**
   * @type {string}
   */
  let appiumHome;

  before(async function () {
    appiumHome = await tempDir.openDir();
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  describe('keyword', function () {
    /**
     * @type {string}
     */
    let help;

    before(async function () {
      await installExtension(
        appiumHome,
        'driver',
        path.join(__dirname, 'fixtures', 'test-driver'),
      );
      help = await runAppium(appiumHome, ['server', '--help']);
    });

    describe('appiumCliIgnore', function () {
      it('should still support arguments without this keyword', function () {
        expect(help).to.match(/oliver-boliver/);
      });

      it('should cause the argument to be suppressed', function () {
        expect(help).not.to.match(/mcmonkey-mcbean/);
      });
    });

    describe('appiumDeprecated', function () {
      it('should mark the argument as deprecated', function () {
        expect(help).to.match(/\[DEPRECATED\] funkytelechy/);
      });
    });
  });
});

// @ts-check
import { fs, tempDir } from '@appium/support';
import path from 'path';
import { DRIVER_TYPE } from '../../lib/constants';
import { resolveFixture } from '../helpers';
import { installLocalExtension, runAppium } from './e2e-helpers';

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
      await installLocalExtension(
        appiumHome,
        DRIVER_TYPE,
        path.dirname(resolveFixture('test-driver/package.json'))
      );
      help = await runAppium(appiumHome, ['server', '--help']);
    });

    describe('appiumCliIgnored', function () {
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

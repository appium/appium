// @ts-check
import {fs, tempDir} from '@appium/support';
import path from 'node:path';
import {DRIVER_TYPE} from '../../lib/constants';
import {resolveFixture} from '../helpers';
import {installLocalExtension, runAppium} from './e2e-helpers';

describe('CLI behavior controlled by schema', function () {
  /**
   * @type {string}
   */
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
      it.skip('should mark the argument as deprecated', function () {
        expect(help).to.match(/\[DEPRECATED\] funkytelechy/);
      });
    });
  });
});

import getPort from 'get-port';
import {tempDir, fs} from '@appium/support';
import {exec} from 'teen_process';
import B from 'bluebird';
import {
  readAppiumArgErrorFixture,
  formatAppiumArgErrorOutput,
  EXECUTABLE,
  runAppiumRaw,
} from './e2e-helpers';
import {APPIUM_ROOT} from '../helpers';
import { stripColorCodes } from '../../lib/logsink';

describe('argument parsing', function () {
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
              String(await getPort()),
            ],
            {
              env: {APPIUM_HOME: appiumHome, PATH: process.env.PATH},
              cwd: APPIUM_ROOT,
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
        const {stderr: actual} = await runAppiumRaw(appiumHome, ['--port=sheep'], {
          env: {FORCE_COLOR: '1'},
        });
        expect(stripColorCodes(actual)).to.not.equal(actual);
      });
    });

    describe('when color output is unsupported', function () {
      it('should output a colorless yet fancy error message', async function () {
        const {stderr: actual} = await runAppiumRaw(appiumHome, ['--port=sheep'], {});
        expect(stripColorCodes(actual)).to.equal(actual);
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

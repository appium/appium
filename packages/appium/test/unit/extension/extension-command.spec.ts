import type {ChildProcess} from 'node:child_process';
import type {Writable} from 'node:stream';
import type {AppiumLogger} from '@appium/types';
import type {SinonSandbox, SinonStub} from 'sinon';
import {DriverConfig} from '../../../lib/extension/driver-config';
import {ExtensionCommand, injectAppiumSymlinks} from '../../../lib/cli/extension-command';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {FAKE_DRIVER_DIR} from '../../helpers';
import {Manifest} from '../../../lib/extension/manifest';
import {fs, system} from '@appium/support';
import * as utils from '../../../lib/utils';
import {expect} from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

/**
 * Relative path from actual `package.json` of `FakeDriver` for the `fake-stdin` script
 */
const FAKE_STDIN_SCRIPT = require(`${FAKE_DRIVER_DIR}/package.json`).appium.scripts['fake-stdin'];

let sandbox: SinonSandbox;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('ExtensionCommand', function () {
  describe('method', function () {
    let ec: ExtensionCommand<any>;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      const driverConfig = DriverConfig.create(sandbox.createStubInstance(Manifest));
      ec = new ExtensionCommand({config: driverConfig, json: false});
    });

    afterEach(function () {
      sandbox.verify();
      sandbox.restore();
    });

    describe('_runUnbuffered()', function () {
      // this test is low value and mostly just asserts that `child_process.spawn()` works.
      // the problem is that because `_run()` returns a `Promise`, a caller cannot reach the
      // underlying `ChildProcess` instance.
      // something like `execa` could work around this because it returns a frankenstein of a
      // `Promise` + `ChildProcess`, but I didn't want to add the dep.
      it('should respond to stdin', function (done) {
        // we have to fake writing to STDIN because this is an automated test, after all.
        const proc = ec._runUnbuffered(FAKE_DRIVER_DIR, FAKE_STDIN_SCRIPT, [], {
          stdio: ['pipe', 'inherit', 'inherit'],
        }) as ChildProcess;

        proc.once('exit', (code: number | null) => {
          try {
            expect(code).to.equal(0);
            done();
          } catch (err) {
            done(err);
          }
        });

        setTimeout(() => {
          // TS does not understand that `proc.stdin` is not `null`, because it is only a `Writable`
          // if STDIN is piped from the parent.
          const stdin = proc.stdin as Writable;
          stdin.write('\n');
          stdin.end();
        }, 200);
      });
    });
  });

  describe('injectAppiumSymlinks', function () {
    let fsExistsStub: SinonStub;
    let fsSymlinkStub: SinonStub;
    let getAppiumModuleRootStub: SinonStub;
    let isWindowsStub: SinonStub;
    let logger: AppiumLogger;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      fsExistsStub = sandbox.stub(fs, 'exists');
      fsSymlinkStub = sandbox.stub(fs, 'symlink');
      getAppiumModuleRootStub = sandbox.stub(utils, 'getAppiumModuleRoot');
      isWindowsStub = sandbox.stub(system, 'isWindows');
      logger = {
        info: sandbox.stub(),
        warn: sandbox.stub(),
        error: sandbox.stub(),
        debug: sandbox.stub(),
      } as unknown as AppiumLogger;

      getAppiumModuleRootStub.returns('/path/to/appium');
      isWindowsStub.returns(false);
    });

    afterEach(function () {
      sandbox.verify();
      sandbox.restore();
    });

    describe('when there are no installed extensions', function () {
      it('should not create any symlinks', async function () {
        const driverConfig = {installedExtensions: {}};
        const pluginConfig = {installedExtensions: {}};

        // @ts-expect-error - partial config for testing
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

        expect(fsSymlinkStub).to.not.have.been.called;
      });
    });

    describe('when there are npm-installed drivers', function () {
      it('should create symlinks for npm-installed drivers', async function () {
        const driverConfig = {
          installedExtensions: {
            'driver-for-test': {
              installType: 'npm',
              installPath: '/path/to/driver-for-test',
            },
          },
        };
        const pluginConfig = {installedExtensions: {}};

        fsExistsStub.withArgs('/path/to/driver-for-test/node_modules').resolves(true);
        fsExistsStub.withArgs('/path/to/driver-for-test/node_modules/appium').resolves(false);

        // @ts-expect-error - partial config for testing
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

        expect(fsExistsStub).to.have.been.calledWith('/path/to/driver-for-test/node_modules');
        expect(fsExistsStub).to.have.been.calledWith('/path/to/driver-for-test/node_modules/appium');
        expect(fsSymlinkStub).to.have.been.calledOnce;
        expect(fsSymlinkStub).to.have.been.calledWith(
          '/path/to/appium',
          '/path/to/driver-for-test/node_modules/appium',
          'dir'
        );
      });

      it('should create junction symlinks on Windows', async function () {
        isWindowsStub.returns(true);
        const driverConfig = {
          installedExtensions: {
            'driver-for-test': {
              installType: 'npm',
              installPath: '/path/to/driver-for-test',
            },
          },
        };
        const pluginConfig = {installedExtensions: {}};

        fsExistsStub.withArgs('/path/to/driver-for-test/node_modules').resolves(true);
        fsExistsStub.withArgs('/path/to/driver-for-test/node_modules/appium').resolves(false);

        // @ts-expect-error - partial config for testing
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

        expect(fsSymlinkStub).to.have.been.calledWith(
          '/path/to/appium',
          '/path/to/driver-for-test/node_modules/appium',
          'junction'
        );
      });

      it('should not create symlinks if node_modules directory does not exist', async function () {
        const driverConfig = {
          installedExtensions: {
            'driver-for-test': {
              installType: 'npm',
              installPath: '/path/to/driver-for-test',
            },
          },
        };
        const pluginConfig = {installedExtensions: {}};

        fsExistsStub.withArgs('/path/to/driver-for-test/node_modules').resolves(false);

        // @ts-expect-error - partial config for testing
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

        expect(fsSymlinkStub).to.not.have.been.called;
      });

      it('should not create symlinks if symlink already exists', async function () {
        const driverConfig = {
          installedExtensions: {
            'driver-for-test': {
              installType: 'npm',
              installPath: '/path/to/driver-for-test',
            },
          },
        };
        const pluginConfig = {installedExtensions: {}};

        fsExistsStub.resolves(true);

        // @ts-expect-error - partial config for testing
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

        expect(fsSymlinkStub).to.not.have.been.called;
      });
    });

    describe('when there are npm-installed plugins', function () {
      it('should create symlinks for npm-installed plugins', async function () {
        const driverConfig = {installedExtensions: {}};
        const pluginConfig = {
          installedExtensions: {
            'plugin-for-test': {
              installType: 'npm',
              installPath: '/path/to/plugin-for-test',
            },
          },
        };

        fsExistsStub.withArgs('/path/to/plugin-for-test/node_modules').resolves(true);
        fsExistsStub.withArgs('/path/to/plugin-for-test/node_modules/appium').resolves(false);

        // @ts-expect-error - partial config for testing
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

        expect(fsSymlinkStub).to.have.been.calledOnce;
        expect(fsSymlinkStub).to.have.been.calledWith(
          '/path/to/appium',
          '/path/to/plugin-for-test/node_modules/appium',
          'dir'
        );
      });
    });

    describe('when there are both drivers and plugins', function () {
      it('should create symlinks for all npm-installed extensions', async function () {
        const driverConfig = {
          installedExtensions: {
            'driver-for-test': {
              installType: 'npm',
              installPath: '/path/to/driver-for-test',
            },
          },
        };
        const pluginConfig = {
          installedExtensions: {
            'plugin-for-test': {
              installType: 'npm',
              installPath: '/path/to/plugin-for-test',
            },
          },
        };

        fsExistsStub.resolves(true);
        fsExistsStub.withArgs('/path/to/driver-for-test/node_modules/appium').resolves(false);
        fsExistsStub.withArgs('/path/to/plugin-for-test/node_modules/appium').resolves(false);

        // @ts-expect-error - partial config for testing
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

        expect(fsSymlinkStub).to.have.been.calledTwice;
      });

      it('should not create symlinks for invalid format - no installPath', async function () {
        const driverConfig = {
          installedExtensions: {
            'driver-for-test': {
              installType: 'npm',
            },
          },
        };
        const pluginConfig = {
          installedExtensions: {
            'plugin-for-test': {
              installType: 'npm',
            },
          },
        };

        // @ts-expect-error - partial config for testing
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

        expect(fsSymlinkStub).to.not.have.been.called;
      });
    });

    describe('when there are non-npm installed extensions', function () {
      for (const installType of ['git', 'local', 'github']) {
        it(`should skip ${installType}-installed extensions`, async function () {
          const driverConfig = {
            installedExtensions: {
              [`${installType}-driver`]: {
                installType,
                installPath: `/path/to/${installType}-driver`,
              },
            },
          };
          const pluginConfig = {installedExtensions: {}};

          // @ts-expect-error - partial config for testing
          await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

          expect(fsSymlinkStub).to.not.have.been.called;
        });
      }

      it('should only create symlinks for npm-installed extensions when mixed', async function () {
        const driverConfig = {
          installedExtensions: {
            'npm-driver': {
              installType: 'npm',
              installPath: '/path/to/npm-driver',
            },
            'git-driver': {
              installType: 'git',
              installPath: '/path/to/git-driver',
            },
          },
        };
        const pluginConfig = {installedExtensions: {}};

        fsExistsStub.resolves(true);
        fsExistsStub.withArgs('/path/to/npm-driver/node_modules/appium').resolves(false);

        // @ts-expect-error - partial config for testing
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

        expect(fsSymlinkStub).to.have.been.calledOnce;
        expect(fsSymlinkStub).to.have.been.calledWith(
          '/path/to/appium',
          '/path/to/npm-driver/node_modules/appium',
          'dir'
        );
      });
    });

    describe('error handling', function () {
      it('should log info message when symlink creation fails', async function () {
        const driverConfig = {
          installedExtensions: {
            'driver-for-test': {
              installType: 'npm',
              installPath: '/path/to/driver-for-test',
            },
          },
        };
        const pluginConfig = {installedExtensions: {}};

        fsExistsStub.resolves(true);
        fsExistsStub.withArgs('/path/to/driver-for-test/node_modules/appium').resolves(false);
        fsSymlinkStub.rejects(new Error('Permission denied'));

        // @ts-expect-error - partial config for testing
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

        expect(logger.info).to.have.been.calledOnce;
        // @ts-ignore
        expect(logger.info.args[0][0]).to.match(/Cannot create a symlink/);
        // @ts-ignore
        expect(logger.info.args[0][0]).to.match(/Permission denied/);
      });

      it('should not throw when getAppiumModuleRoot fails', async function () {
        const driverConfig = {
          installedExtensions: {
            'driver-for-test': {
              installType: 'npm',
              installPath: '/path/to/driver-for-test',
            },
          },
        };
        const pluginConfig = {installedExtensions: {}};

        getAppiumModuleRootStub.throws(new Error('Module not found'));
        fsExistsStub.resolves(true);
        fsExistsStub.withArgs('/path/to/driver-for-test/node_modules/appium').resolves(false);

        // @ts-expect-error - partial config for testing
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

        expect(logger.info).to.have.been.calledOnce;
        // @ts-ignore
        expect(logger.info.args[0][0]).to.match(/Cannot create a symlink/);
      });
    });

    describe('with null or undefined configs', function () {
      it('should handle null installedExtensions', async function () {
        const driverConfig = {installedExtensions: null};
        const pluginConfig = {installedExtensions: null};

        // @ts-expect-error - partial config for testing
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

        expect(fsSymlinkStub).to.not.have.been.called;
      });

      it('should handle undefined installedExtensions', async function () {
        const driverConfig = {};
        const pluginConfig = {};

        // @ts-expect-error - partial config for testing
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);

        expect(fsSymlinkStub).to.not.have.been.called;
      });
    });
  });
});

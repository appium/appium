import type {ChildProcess} from 'node:child_process';
import type {Writable} from 'node:stream';
import {describe, it, beforeEach, afterEach} from 'node:test';

import {fs, system} from '@appium/support';
import type {AppiumLogger} from '@appium/types';
import {expect} from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type {SinonSandbox, SinonStub} from 'sinon';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {ExtensionCliCommand, injectAppiumSymlinks} from '../../../lib/cli/extension-command';
import type {ExtensionConfig} from '../../../lib/cli/extension-command';
import {DriverConfig} from '../../../lib/extension/driver-config';
import {Manifest} from '../../../lib/extension/manifest';
import {appiumPackageRoot} from '../../../lib/utils';
import {FAKE_DRIVER_DIR} from '../../helpers';

/**
 * Relative path from actual `package.json` of `FakeDriver` for the `fake-stdin` script
 */
const FAKE_STDIN_SCRIPT = require(`${FAKE_DRIVER_DIR}/package.json`).appium.scripts['fake-stdin'];

let sandbox: SinonSandbox;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('ExtensionCommand', function () {
  const asExtensionConfig = (value: unknown): ExtensionConfig<any> => value as ExtensionConfig<any>;

  describe('method', function () {
    let ec: ExtensionCliCommand;
    class TestExtensionCommand extends ExtensionCliCommand {
      protected override getPostInstallText(): string {
        return '';
      }

      protected override validateExtensionFields(): void {}
    }

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      const driverConfig = DriverConfig.create(sandbox.createStubInstance(Manifest));
      ec = new TestExtensionCommand({config: driverConfig, json: false});
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
      it('should respond to stdin', async function () {
        // we have to fake writing to STDIN because this is an automated test, after all.
        const proc = (ec as any)._runUnbuffered(FAKE_DRIVER_DIR, FAKE_STDIN_SCRIPT, [], {
          stdio: ['pipe', 'inherit', 'inherit'],
        }) as ChildProcess;

        const exitPromise = new Promise<void>((resolve, reject) => {
          proc.once('exit', (code: number | null) => {
            try {
              expect(code).to.equal(0);
              resolve();
            } catch (err) {
              reject(err);
            }
          });
        });

        setTimeout(() => {
          // TS does not understand that `proc.stdin` is not `null`, because it is only a `Writable`
          // if STDIN is piped from the parent.
          const stdin = proc.stdin as Writable;
          stdin.write('\n');
          stdin.end();
        }, 200);

        await exitPromise;
      });
    });
  });

  describe('injectAppiumSymlinks', function () {
    let fsExistsStub: SinonStub;
    let fsSymlinkStub: SinonStub;
    let isWindowsStub: SinonStub;
    let logger: AppiumLogger;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      fsExistsStub = sandbox.stub(fs, 'exists');
      fsSymlinkStub = sandbox.stub(fs, 'symlink');
      isWindowsStub = sandbox.stub(system, 'isWindows');
      logger = {
        info: sandbox.stub(),
        warn: sandbox.stub(),
        error: sandbox.stub(),
        debug: sandbox.stub(),
      } as unknown as AppiumLogger;

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

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

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

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

        expect(fsExistsStub).to.have.been.calledWith('/path/to/driver-for-test/node_modules');
        expect(fsExistsStub).to.have.been.calledWith('/path/to/driver-for-test/node_modules/appium');
        expect(fsSymlinkStub).to.have.been.calledOnce;
        expect(fsSymlinkStub).to.have.been.calledWith(
          appiumPackageRoot,
          '/path/to/driver-for-test/node_modules/appium',
          'dir',
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

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

        expect(fsSymlinkStub).to.have.been.calledWith(
          appiumPackageRoot,
          '/path/to/driver-for-test/node_modules/appium',
          'junction',
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

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

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

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

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

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

        expect(fsSymlinkStub).to.have.been.calledOnce;
        expect(fsSymlinkStub).to.have.been.calledWith(
          appiumPackageRoot,
          '/path/to/plugin-for-test/node_modules/appium',
          'dir',
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

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

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

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

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

          await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

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

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

        expect(fsSymlinkStub).to.have.been.calledOnce;
        expect(fsSymlinkStub).to.have.been.calledWith(
          appiumPackageRoot,
          '/path/to/npm-driver/node_modules/appium',
          'dir',
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

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

        expect(logger.info).to.have.been.calledOnce;
        // @ts-ignore
        expect(logger.info.args[0][0]).to.match(/Cannot create a symlink/);
        // @ts-ignore
        expect(logger.info.args[0][0]).to.match(/Permission denied/);
      });
    });

    describe('with null or undefined configs', function () {
      it('should handle null installedExtensions', async function () {
        const driverConfig = {installedExtensions: null};
        const pluginConfig = {installedExtensions: null};

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

        expect(fsSymlinkStub).to.not.have.been.called;
      });

      it('should handle undefined installedExtensions', async function () {
        const driverConfig = {};
        const pluginConfig = {};

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

        expect(fsSymlinkStub).to.not.have.been.called;
      });
    });
  });
});

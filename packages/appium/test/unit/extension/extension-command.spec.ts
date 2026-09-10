import assert from 'node:assert/strict';
import type {ChildProcess} from 'node:child_process';
import path from 'node:path';
import type {Writable} from 'node:stream';
import {describe, it, beforeEach, afterEach} from 'node:test';

import {console, fs, npm, system} from '@appium/support';
import type {AppiumLogger} from '@appium/types';
import type {ExtManifest} from 'appium/types';
import type {SinonSandbox, SinonStub} from 'sinon';
import sinon from 'sinon';

import DriverCliCommand from '../../../lib/cli/driver-command';
import {ExtensionCliCommand, injectAppiumSymlinks} from '../../../lib/cli/extension-command';
import type {ExtensionConfig} from '../../../lib/cli/extension-command';
import PluginCliCommand from '../../../lib/cli/plugin-command';
import {DriverConfig} from '../../../lib/extension/driver-config';
import {Manifest} from '../../../lib/extension/manifest';
import {PluginConfig} from '../../../lib/extension/plugin-config';
import {appiumPackageRoot} from '../../../lib/utils';
import {FAKE_DRIVER_DIR} from '../../helpers';

/**
 * Relative path from actual `package.json` of `FakeDriver` for the `fake-stdin` script
 */
const FAKE_STDIN_SCRIPT = require(`${FAKE_DRIVER_DIR}/package.json`).appium.scripts['fake-stdin'];

let sandbox: SinonSandbox;

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
              assert.strictEqual(code, 0);
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

  for (const type of ['driver', 'plugin'] as const) {
    describe(`installed ${type} names`, function () {
      const commands = ['uninstall', 'update', 'run', 'doctor'] as const;
      type Command = (typeof commands)[number];
      const pkgName = `appium-test-${type}`;
      const scopedPkgName = `@example/${pkgName}`;
      const appiumHome = path.resolve('appium-home-for-test');
      let ec: ExtensionCliCommand;
      let config: DriverConfig | PluginConfig;
      let uninstallStub: SinonStub;
      let removeStub: SinonStub;
      let checkUpdateStub: SinonStub;
      let updateStub: SinonStub;
      let getInstallPathSpy: sinon.SinonSpy;
      let existsStub: SinonStub;
      let readFileStub: SinonStub;

      function extension(packageName: string): ExtManifest<'driver'> {
        return {
          pkgName: packageName,
          version: '1.0.0',
          installType: 'npm',
          installSpec: packageName,
          installPath: path.join(appiumHome, 'node_modules', packageName),
          mainClass: 'TestExtension',
          automationName: 'Test',
          platformNames: ['Test'],
          scripts: {sample: 'scripts/sample.js'},
        };
      }

      function invoke(command: Command, name: string): Promise<unknown> {
        return ec.execute({[`${type}Command`]: command, [type]: name, unsafe: false});
      }

      async function assertHandles(command: Command, input: string, expectedName: string): Promise<void> {
        const expected = config.installedExtensions[expectedName];
        const result = await invoke(command, input);
        switch (command) {
          case 'uninstall':
            sinon.assert.calledOnceWithExactly(uninstallStub, appiumHome, expected.pkgName);
            sinon.assert.calledOnceWithExactly(removeStub, expectedName);
            assert.strictEqual(result, config.installedExtensions);
            break;
          case 'update':
            sinon.assert.calledOnceWithExactly(checkUpdateStub, expectedName);
            sinon.assert.calledOnceWithExactly(updateStub, expectedName, '1.1.0');
            assert.deepStrictEqual(result, {
              updates: {[expectedName]: {from: '1.0.0', to: '1.1.0'}},
              errors: {},
            });
            break;
          case 'run':
            sinon.assert.calledOnceWithExactly(getInstallPathSpy, expectedName);
            sinon.assert.calledOnceWithExactly(existsStub, path.join(expected.installPath, 'scripts/sample.js'));
            assert.deepStrictEqual(result, {});
            break;
          case 'doctor':
            sinon.assert.calledOnceWithExactly(getInstallPathSpy, expectedName);
            sinon.assert.calledOnceWithExactly(readFileStub, path.join(expected.installPath, 'package.json'), 'utf8');
            assert.strictEqual(result, 0);
            break;
        }
      }

      beforeEach(function () {
        sandbox = sinon.createSandbox();
        const logger = sandbox.createStubInstance(console.CliConsole);
        logger.decorate.callsFake((message) => message);
        sandbox.stub(console, 'CliConsole').returns(logger);
        const manifest = sandbox.createStubInstance(Manifest);
        sandbox.stub(manifest, 'appiumHome').get(() => appiumHome);
        if (type === 'driver') {
          config = DriverConfig.create(manifest);
          ec = new DriverCliCommand({config, json: true});
        } else {
          config = PluginConfig.create(manifest);
          ec = new PluginCliCommand({config, json: true});
        }
        config.installedExtensions = {short: extension(pkgName), scoped: extension(scopedPkgName)};
        uninstallStub = sandbox.stub(npm, 'uninstallPackage').resolves();
        removeStub = sandbox.stub(config, 'removeExtension').resolves();
        checkUpdateStub = sandbox.stub(ec as any, 'checkForExtensionUpdate').resolves({
          current: '1.0.0',
          safeUpdate: '1.1.0',
          unsafeUpdate: null,
        });
        updateStub = sandbox.stub(ec as any, 'updateExtension').resolves();
        getInstallPathSpy = sandbox.spy(config, 'getInstallPath');
        existsStub = sandbox.stub(fs, 'exists').resolves(true);
        readFileStub = sandbox.stub(fs, 'readFile').resolves('{"appium":{}}');
      });

      afterEach(function () {
        sandbox.restore();
      });

      for (const command of commands) {
        describe(command, function () {
          for (const [input, expectedName] of [
            ['short', 'short'],
            [pkgName, 'short'],
            [scopedPkgName, 'scoped'],
          ]) {
            it(`should accept ${input} as the installed extension`, async function () {
              await assertHandles(command, input, expectedName);
            });
          }

          it('should prefer an extension name over another extension package name', async function () {
            config.installedExtensions[pkgName] = extension('another-package');
            await assertHandles(command, pkgName, pkgName);
          });

          for (const input of ['unknown', pkgName.slice(0, -1), `${pkgName}@1.0.0`, `${scopedPkgName}@1.0.0`]) {
            it(`should reject ${input} without changing the installed-extension error`, async function () {
              const message =
                command === 'uninstall'
                  ? `Can't uninstall ${type} '${input}'; it is not installed`
                  : command === 'update'
                    ? `The ${type} "${input}" was not installed, so can't be updated`
                    : `The ${type} "${input}" is not installed`;
              await assert.rejects(invoke(command, input), {message});
              sinon.assert.notCalled(uninstallStub);
              sinon.assert.notCalled(removeStub);
              sinon.assert.notCalled(checkUpdateStub);
              sinon.assert.notCalled(updateStub);
              sinon.assert.notCalled(getInstallPathSpy);
            });
          }
        });
      }

      it('should update all extensions for installed even when it matches an extension and a package', async function () {
        config.installedExtensions.short.pkgName = 'installed';
        config.installedExtensions.installed = extension('another-package');

        assert.deepStrictEqual(await invoke('update', 'installed'), {
          updates: {
            short: {from: '1.0.0', to: '1.1.0'},
            scoped: {from: '1.0.0', to: '1.1.0'},
            installed: {from: '1.0.0', to: '1.1.0'},
          },
          errors: {},
        });
        assert.deepStrictEqual(checkUpdateStub.args, [['short'], ['scoped'], ['installed']]);
      });

      it('should preserve the development extension uninstall restriction for a package name', async function () {
        config.installedExtensions.short.installType = 'dev';

        assert.strictEqual(await invoke('uninstall', pkgName), config.installedExtensions);
        sinon.assert.notCalled(uninstallStub);
        sinon.assert.notCalled(removeStub);
      });

      it('should preserve the non-npm extension update restriction for a package name', async function () {
        config.installedExtensions.short.installType = 'local';

        const result = (await invoke('update', pkgName)) as {updates: object; errors: Record<string, Error>};
        assert.deepStrictEqual(result.updates, {});
        assert.deepStrictEqual(Object.keys(result.errors), ['short']);
        sinon.assert.notCalled(checkUpdateStub);
        sinon.assert.notCalled(updateStub);
      });
    });
  }

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

        assert.strictEqual(fsSymlinkStub.called, false);
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

        assert.ok(fsExistsStub.calledWith('/path/to/driver-for-test/node_modules'));
        assert.ok(fsExistsStub.calledWith('/path/to/driver-for-test/node_modules/appium'));
        assert.strictEqual(fsSymlinkStub.calledOnce, true);
        assert.ok(fsSymlinkStub.calledWith(appiumPackageRoot, '/path/to/driver-for-test/node_modules/appium', 'dir'));
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

        assert.ok(
          fsSymlinkStub.calledWith(appiumPackageRoot, '/path/to/driver-for-test/node_modules/appium', 'junction'),
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

        assert.strictEqual(fsSymlinkStub.called, false);
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

        assert.strictEqual(fsSymlinkStub.called, false);
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

        assert.strictEqual(fsSymlinkStub.calledOnce, true);
        assert.ok(fsSymlinkStub.calledWith(appiumPackageRoot, '/path/to/plugin-for-test/node_modules/appium', 'dir'));
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

        assert.strictEqual(fsSymlinkStub.calledTwice, true);
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

        assert.strictEqual(fsSymlinkStub.called, false);
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

          assert.strictEqual(fsSymlinkStub.called, false);
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

        assert.strictEqual(fsSymlinkStub.calledOnce, true);
        assert.ok(fsSymlinkStub.calledWith(appiumPackageRoot, '/path/to/npm-driver/node_modules/appium', 'dir'));
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

        assert.strictEqual((logger.info as unknown as SinonStub).calledOnce, true);
        // @ts-ignore
        assert.match(logger.info.args[0][0], /Cannot create a symlink/);
        // @ts-ignore
        assert.match(logger.info.args[0][0], /Permission denied/);
      });
    });

    describe('with null or undefined configs', function () {
      it('should handle null installedExtensions', async function () {
        const driverConfig = {installedExtensions: null};
        const pluginConfig = {installedExtensions: null};

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

        assert.strictEqual(fsSymlinkStub.called, false);
      });

      it('should handle undefined installedExtensions', async function () {
        const driverConfig = {};
        const pluginConfig = {};

        await injectAppiumSymlinks(asExtensionConfig(driverConfig), asExtensionConfig(pluginConfig), logger);

        assert.strictEqual(fsSymlinkStub.called, false);
      });
    });
  });
});

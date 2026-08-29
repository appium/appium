import assert from 'node:assert/strict';
import path from 'node:path';
import {afterEach, beforeEach, describe, it, type TestContext} from 'node:test';

import type {SinonSandbox} from 'sinon';
import type {TeenProcessExecResult} from 'teen_process';

import {initMocks, type MockReadPackage, type MockTeenProcess} from '../mocks.js';

function missingPackageJsonError(): NodeJS.ErrnoException {
  const err = new Error('ENOENT') as NodeJS.ErrnoException;
  err.code = 'ENOENT';
  return err;
}

describe('env', function () {
  let env: any;
  let sandbox: SinonSandbox;
  let MockReadPackage: MockReadPackage;
  let MockTeenProcess: MockTeenProcess;
  let envAppiumHome: string | undefined;
  let importCounter = 0;

  beforeEach(async function (context) {
    const t = context as TestContext;
    const result = initMocks();
    MockReadPackage = result.MockReadPackage;
    MockTeenProcess = result.MockTeenProcess;
    sandbox = result.sandbox;

    // Ensure an APPIUM_HOME in the environment does not befoul our tests.
    envAppiumHome = process.env.APPIUM_HOME;
    delete process.env.APPIUM_HOME;

    // Spread the real module's exports before overriding `readPackage`: `env.js`
    // transitively loads `util.js` -> `fs.js`, which also import from this same
    // module, and a mock replaces the *entire* module for every importer in the graph.
    const realInternal = await import('../../lib/internal/index.js');
    t.mock.module('../../lib/internal/index.js', {
      namedExports: {...realInternal, readPackage: result.MockInternal.readPackage},
    });
    // Cache-busting query forces a fresh evaluation of env.js on each test, so it
    // re-links to the mock set above instead of reusing a previous test's binding.
    env = await import(`../../lib/env.js?t=${importCounter++}`);

    env.findAppiumDependencyPackage.cache = new Map();
    env.resolveManifestPath.cache = new Map();
    env.resolveAppiumHome.cache = new Map();
  });

  describe('resolveManifestPath()', function () {
    describe('when appium is not resolvable from cwd', function () {
      it('should return a path relative to the default APPIUM_HOME', async function () {
        assert.strictEqual(
          await env.resolveManifestPath(),
          path.join(env.DEFAULT_APPIUM_HOME, env.MANIFEST_RELATIVE_PATH),
        );
      });
    });

    describe('when provided an explicit APPIUM_HOME', function () {
      describe('when a manifest file exists there', function () {
        it('it should return the existing path', async function () {
          assert.strictEqual(
            await env.resolveManifestPath('/somewhere/over/the/rainbow'),
            path.join('/somewhere/over/the/rainbow', env.MANIFEST_RELATIVE_PATH),
          );
        });
      });
    });
  });

  describe('resolveAppiumHome()', function () {
    describe('when param is not absolute', function () {
      it('should reject', async function () {
        await assert.rejects(env.resolveAppiumHome('foo'), {name: 'TypeError', message: /absolute/i});
      });
    });

    describe('when APPIUM_HOME is set in env', function () {
      describe('when APPIUM_HOME is absolute', function () {
        beforeEach(function () {
          process.env.APPIUM_HOME = path.resolve(path.sep, 'some', 'appium-home');
        });

        it('should resolve APPIUM_HOME from env', async function () {
          assert.strictEqual(await env.resolveAppiumHome(), process.env.APPIUM_HOME);
        });
      });

      describe('when APPIUM_HOME is relative', function () {
        beforeEach(function () {
          process.env.APPIUM_HOME = path.join('some', 'appium-home');
        });
        it('should resolve to an absolute path', async function () {
          assert.strictEqual(
            await env.resolveAppiumHome(),
            path.join(process.cwd(), process.env.APPIUM_HOME as string),
          );
        });
      });
    });

    describe('when APPIUM_HOME is not set in env', function () {
      describe('when Appium is not resolvable from cwd', function () {
        describe('when `appium` is not a dependency of the package in the cwd', function () {
          beforeEach(function () {
            // Override the default mock behavior (which returns a package object) to simulate no local `package.json`/dependency info.
            MockReadPackage.readPackage.resolves(undefined as any);
          });

          it('should resolve with DEFAULT_APPIUM_HOME', async function () {
            assert.strictEqual(await env.resolveAppiumHome('/somewhere'), env.DEFAULT_APPIUM_HOME);
          });
        });

        describe('when `appium` is a dependency of the package in the cwd', function () {
          const appiumHome = path.resolve(path.sep, 'somewhere');

          describe('when `appium` is a dependency which does not resolve to a file path', function () {
            beforeEach(function () {
              MockReadPackage.readPackage.resolves({
                devDependencies: {appium: '2.0.0-beta.25'},
              } as any);
            });

            it('should resolve with the identity', async function () {
              assert.strictEqual(await env.resolveAppiumHome(appiumHome), appiumHome);
            });
          });

          describe('when `appium` is a dependency for version 0.x', function () {
            beforeEach(function () {
              MockReadPackage.readPackage.resolves({devDependencies: {appium: '0.9.0'}} as any);
            });
            it('should resolve with DEFAULT_APPIUM_HOME', async function () {
              assert.strictEqual(await env.resolveAppiumHome(appiumHome), env.DEFAULT_APPIUM_HOME);
            });
          });

          describe('when `appium` is a dependency for version 1.x', function () {
            beforeEach(function () {
              MockReadPackage.readPackage.resolves({devDependencies: {appium: '1.2.3'}} as any);
            });

            it('should resolve with DEFAULT_APPIUM_HOME', async function () {
              assert.strictEqual(await env.resolveAppiumHome(appiumHome), env.DEFAULT_APPIUM_HOME);
            });
          });
        });
      });

      describe('when reading `package.json` causes an exception', function () {
        beforeEach(function () {
          // Unclear if this is even possible.
          MockReadPackage.readPackage.rejects(new Error('on the fritz'));
        });

        it('should resolve with DEFAULT_APPIUM_HOME', async function () {
          assert.strictEqual(await env.resolveAppiumHome('/somewhere'), env.DEFAULT_APPIUM_HOME);
        });
      });

      describe('when `package.json` not found', function () {
        beforeEach(function () {
          MockReadPackage.readPackage.rejects(missingPackageJsonError());
        });

        it('should resolve with DEFAULT_APPIUM_HOME', async function () {
          assert.strictEqual(await env.resolveAppiumHome('/somewhere'), env.DEFAULT_APPIUM_HOME);
        });
      });
    });
  });

  describe('readPackageInDir()', function () {
    it('should read package.json from the given directory', async function () {
      await env.readPackageInDir('/somewhere');
      assert.strictEqual(
        MockReadPackage.readPackage.calledWithExactly({
          cwd: '/somewhere',
          normalize: true,
        }),
        true,
      );
    });

    it('should resolve with undefined when package.json is missing', async function () {
      MockReadPackage.readPackage.rejects(missingPackageJsonError());
      assert.strictEqual(await env.readPackageInDir('/somewhere'), undefined);
    });

    it('should reject when reading package.json fails for reasons other than ENOENT', async function () {
      MockReadPackage.readPackage.rejects(new Error('on the fritz'));
      await assert.rejects(env.readPackageInDir('/somewhere'), /on the fritz/);
    });
  });

  describe('hasAppiumDependency()', function () {
    describe('when Appium is not resolvable from cwd', function () {
      describe('when `appium` is not a dependency of the local package', function () {
        beforeEach(function () {
          // Override the default mock behavior (which returns a package object) to simulate missing `package.json`.
          MockReadPackage.readPackage.rejects(missingPackageJsonError());
        });

        it('should resolve `false`', async function () {
          assert.strictEqual(await env.hasAppiumDependency('/somewhere'), false);
        });

        describe('when it is installed, but extraneous', function () {
          beforeEach(function () {
            MockTeenProcess.exec.resolves({
              stdout: JSON.stringify({
                version: '0.0.0',
                name: 'some-pkg',
                dependencies: {
                  appium: {
                    extraneous: true,
                    version: '2.0.0-beta.25',
                    resolved: 'https://some/appium-tarball.tgz',
                  },
                },
              }),
              stderr: '',
              code: 0,
            } as TeenProcessExecResult<any>);
          });

          it('should resolve `false`', async function () {
            assert.strictEqual(await env.hasAppiumDependency('/somewhere'), false);
          });
        });
      });

      describe('when `appium` is a dependency of the local package', function () {
        // The tests in here are pretty barebones, since there are many variations we haven't covered (despite the LoC coverage). Might be a good application for property testing.
        describe('when `appium` is not yet actually installed', function () {
          beforeEach(function () {
            MockTeenProcess.exec.rejects(new Error());
          });

          describe('when `appium` dep is current', function () {
            beforeEach(function () {
              MockReadPackage.readPackage.resolves({devDependencies: {appium: '2.0.0'}} as any);
            });

            it('should resolve `true`', async function () {
              assert.strictEqual(await env.hasAppiumDependency('/somewhere'), true);
            });
          });

          describe('when `appium` dep is v1.x', function () {
            beforeEach(function () {
              MockReadPackage.readPackage.resolves({optionalDependencies: {appium: '1.x'}} as any);
            });
            it('should resolve `false`', async function () {
              assert.strictEqual(await env.hasAppiumDependency('/somewhere'), false);
            });
          });

          describe('when `appium` dep is v0.x', function () {
            beforeEach(function () {
              MockReadPackage.readPackage.resolves({dependencies: {appium: '0.x'}} as any);
            });

            it('should resolve `false`', async function () {
              assert.strictEqual(await env.hasAppiumDependency('/somewhere'), false);
            });
          });
        });

        describe('when `appium` is installed', function () {
          describe('when `appium` is a dependency for version 0.x', function () {
            beforeEach(function () {
              MockTeenProcess.exec.resolves({
                stdout: JSON.stringify({
                  version: '0.0.0',
                  name: 'some-pkg',
                  dependencies: {
                    appium: {
                      version: '0.1.2',
                      resolved: 'https://whatever',
                    },
                  },
                }),
                stderr: '',
                code: 0,
              } as TeenProcessExecResult<any>);
            });
            it('should resolve `false`', async function () {
              assert.strictEqual(await env.hasAppiumDependency('/somewhere'), false);
            });
          });

          describe('when `appium` is a dependency for version 1.x', function () {
            beforeEach(function () {
              MockTeenProcess.exec.resolves({
                stdout: JSON.stringify({
                  version: '0.0.0',
                  name: 'some-pkg',
                  dependencies: {
                    appium: {
                      version: '1.x',
                      resolved: 'https://whatever',
                    },
                  },
                }),
                stderr: '',
                code: 0,
              } as TeenProcessExecResult<any>);
            });

            it('should resolve `false`', async function () {
              assert.strictEqual(await env.hasAppiumDependency('/somewhere'), false);
            });
          });
        });
      });
    });
  });

  afterEach(function () {
    sandbox.restore();
    process.env.APPIUM_HOME = envAppiumHome;
  });
});

import assert from 'node:assert/strict';
import path from 'node:path';
import {afterEach, beforeEach, describe, it, mock, type TestContext} from 'node:test';

import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';

function missingPackageJsonError(): NodeJS.ErrnoException {
  const err = new Error('ENOENT') as NodeJS.ErrnoException;
  err.code = 'ENOENT';
  return err;
}

// `env.ts` imports `read-package.ts` directly (not through the `utils/index.js` barrel), so
// mocking that one leaf specifier is enough here.
describe('utils/env', function () {
  let env: any;
  let sandbox: SinonSandbox;
  let readPackage: SinonStub;
  let envAppiumHome: string | undefined;
  let importCounter = 0;

  beforeEach(async function (context) {
    const t = context as TestContext;
    sandbox = createSandbox();
    readPackage = sandbox.stub().resolves({name: 'some-pkg', version: '0.0.0', readme: '', _id: 'some-pkg'});

    // Ensure an APPIUM_HOME in the environment does not befoul our tests.
    envAppiumHome = process.env.APPIUM_HOME;
    delete process.env.APPIUM_HOME;

    t.mock.module('../../../lib/utils/read-package.js', {
      namedExports: {readPackage},
    });
    // Cache-busting query forces a fresh evaluation of env.js on each test, so it
    // re-links to the mock set above instead of reusing a previous test's binding.
    env = await import(`../../../lib/utils/env.js?t=${importCounter++}`);

    env.findAppiumDependencyPackage.cache = new Map();
    env.resolveManifestPath.cache = new Map();
    env.resolveAppiumHome.cache = new Map();
  });

  afterEach(function () {
    sandbox.restore();
    mock.reset();
    process.env.APPIUM_HOME = envAppiumHome;
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
            readPackage.resolves(undefined as any);
          });

          it('should resolve with DEFAULT_APPIUM_HOME', async function () {
            assert.strictEqual(await env.resolveAppiumHome('/somewhere'), env.DEFAULT_APPIUM_HOME);
          });
        });

        describe('when `appium` is a dependency of the package in the cwd', function () {
          const appiumHome = path.resolve(path.sep, 'somewhere');

          describe('when `appium` is a dependency which does not resolve to a file path', function () {
            beforeEach(function () {
              readPackage.resolves({
                devDependencies: {appium: '2.0.0-beta.25'},
              } as any);
            });

            it('should resolve with the identity', async function () {
              assert.strictEqual(await env.resolveAppiumHome(appiumHome), appiumHome);
            });
          });

          describe('when `appium` is a dependency for version 0.x', function () {
            beforeEach(function () {
              readPackage.resolves({devDependencies: {appium: '0.9.0'}} as any);
            });
            it('should resolve with DEFAULT_APPIUM_HOME', async function () {
              assert.strictEqual(await env.resolveAppiumHome(appiumHome), env.DEFAULT_APPIUM_HOME);
            });
          });

          describe('when `appium` is a dependency for version 1.x', function () {
            beforeEach(function () {
              readPackage.resolves({devDependencies: {appium: '1.2.3'}} as any);
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
          readPackage.rejects(new Error('on the fritz'));
        });

        it('should resolve with DEFAULT_APPIUM_HOME', async function () {
          assert.strictEqual(await env.resolveAppiumHome('/somewhere'), env.DEFAULT_APPIUM_HOME);
        });
      });

      describe('when `package.json` not found', function () {
        beforeEach(function () {
          readPackage.rejects(missingPackageJsonError());
        });

        it('should resolve with DEFAULT_APPIUM_HOME', async function () {
          assert.strictEqual(await env.resolveAppiumHome('/somewhere'), env.DEFAULT_APPIUM_HOME);
        });
      });
    });
  });

  describe('hasAppiumDependency()', function () {
    describe('when `appium` is not a dependency of the local package', function () {
      beforeEach(function () {
        readPackage.rejects(missingPackageJsonError());
      });

      it('should resolve `false`', async function () {
        assert.strictEqual(await env.hasAppiumDependency('/somewhere'), false);
      });
    });

    describe('when `appium` is a dependency of the local package', function () {
      describe('when `appium` dep is current', function () {
        beforeEach(function () {
          readPackage.resolves({devDependencies: {appium: '2.0.0'}} as any);
        });

        it('should resolve `true`', async function () {
          assert.strictEqual(await env.hasAppiumDependency('/somewhere'), true);
        });
      });

      describe('when `appium` dep is v1.x', function () {
        beforeEach(function () {
          readPackage.resolves({optionalDependencies: {appium: '1.x'}} as any);
        });
        it('should resolve `false`', async function () {
          assert.strictEqual(await env.hasAppiumDependency('/somewhere'), false);
        });
      });

      describe('when `appium` dep is v0.x', function () {
        beforeEach(function () {
          readPackage.resolves({dependencies: {appium: '0.x'}} as any);
        });

        it('should resolve `false`', async function () {
          assert.strictEqual(await env.hasAppiumDependency('/somewhere'), false);
        });
      });
    });
  });
});

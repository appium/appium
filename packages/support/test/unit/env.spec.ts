import path from 'node:path';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as chai from 'chai';
import type {SinonSandbox} from 'sinon';
import type {TeenProcessExecResult} from 'teen_process';
import {rewiremock} from '../helpers';
import {initMocks, type MockPkgDir, type MockReadPkg, type MockTeenProcess} from '../mocks';

describe('env', function () {
  let env: any;
  let sandbox: SinonSandbox;
  let MockPkgDir: MockPkgDir;
  let MockReadPkg: MockReadPkg;
  let MockTeenProcess: MockTeenProcess;
  let envAppiumHome: string | undefined;

  before(function () {
    use(chaiAsPromised);
    chai.should();
  });

  beforeEach(function () {
    const result = initMocks();
    MockPkgDir = result.MockPkgDir;
    MockReadPkg = result.MockReadPkg;
    MockTeenProcess = result.MockTeenProcess;
    sandbox = result.sandbox;
    const overrides = result.overrides;

    envAppiumHome = process.env.APPIUM_HOME;
    delete process.env.APPIUM_HOME;

    env = rewiremock.proxy(() => require('../../lib/env'), overrides);

    env.findAppiumDependencyPackage.cache = new Map();
    env.resolveManifestPath.cache = new Map();
    env.resolveAppiumHome.cache = new Map();
  });

  describe('resolveManifestPath()', function () {
    describe('when appium is not resolvable from cwd', function () {
      beforeEach(function () {
        MockPkgDir.throws();
      });

      it('should return a path relative to the default APPIUM_HOME', async function () {
        expect(await env.resolveManifestPath()).to.equal(
          path.join(env.DEFAULT_APPIUM_HOME, env.MANIFEST_RELATIVE_PATH)
        );
      });
    });

    describe('when provided an explicit APPIUM_HOME', function () {
      describe('when a manifest file exists there', function () {
        it('it should return the existing path', async function () {
          expect(await env.resolveManifestPath('/somewhere/over/the/rainbow')).to.equal(
            path.join('/somewhere/over/the/rainbow', env.MANIFEST_RELATIVE_PATH)
          );
        });
      });
    });
  });

  describe('resolveAppiumHome()', function () {
    describe('when param is not absolute', function () {
      it('should reject', async function () {
        await expect(env.resolveAppiumHome('foo')).to.be.rejectedWith(TypeError, /absolute/i);
      });
    });

    describe('when APPIUM_HOME is set in env', function () {
      describe('when APPIUM_HOME is absolute', function () {
        beforeEach(function () {
          process.env.APPIUM_HOME = path.resolve(path.sep, 'some', 'appium-home');
        });

        it('should resolve APPIUM_HOME from env', async function () {
          await expect(env.resolveAppiumHome()).to.eventually.equal(process.env.APPIUM_HOME);
        });
      });

      describe('when APPIUM_HOME is relative', function () {
        beforeEach(function () {
          process.env.APPIUM_HOME = path.join('some', 'appium-home');
        });
        it('should resolve to an absolute path', async function () {
          await expect(env.resolveAppiumHome()).to.eventually.equal(
            path.join(process.cwd(), process.env.APPIUM_HOME as string)
          );
        });
      });
    });

    describe('when APPIUM_HOME is not set in env', function () {
      describe('when Appium is not resolvable from cwd', function () {
        describe('when `appium` is not a dependency of the package in the cwd', function () {
          beforeEach(function () {
            MockReadPkg.readPackage.resolves(undefined as any);
          });

          it('should resolve with DEFAULT_APPIUM_HOME', async function () {
            await expect(env.resolveAppiumHome('/somewhere')).to.eventually.equal(
              env.DEFAULT_APPIUM_HOME
            );
          });
        });

        describe('when `appium` is a dependency of the package in the cwd', function () {
          const appiumHome = path.resolve(path.sep, 'somewhere');

          describe('when `appium` is a dependency which does not resolve to a file path`', function () {
            beforeEach(function () {
              MockReadPkg.readPackage.resolves({devDependencies: {appium: '2.0.0-beta.25'}} as any);
            });

            it('should resolve with the identity', async function () {
              await expect(env.resolveAppiumHome(appiumHome)).to.eventually.equal(appiumHome);
            });
          });

          describe('when `appium` is a dependency for version 0.x', function () {
            beforeEach(function () {
              MockReadPkg.readPackage.resolves({devDependencies: {appium: '0.9.0'}} as any);
            });
            it('should resolve with DEFAULT_APPIUM_HOME', async function () {
              await expect(env.resolveAppiumHome(appiumHome)).to.eventually.equal(
                env.DEFAULT_APPIUM_HOME
              );
            });
          });

          describe('when `appium` is a dependency for version 1.x', function () {
            beforeEach(function () {
              MockReadPkg.readPackage.resolves({devDependencies: {appium: '1.2.3'}} as any);
            });

            it('should resolve with DEFAULT_APPIUM_HOME', async function () {
              await expect(env.resolveAppiumHome(appiumHome)).to.eventually.equal(
                env.DEFAULT_APPIUM_HOME
              );
            });
          });
        });
      });

      describe('when reading `package.json` causes an exception', function () {
        beforeEach(function () {
          MockReadPkg.readPackage.rejects(new Error('on the fritz'));
        });

        it('should resolve with DEFAULT_APPIUM_HOME', async function () {
          await expect(env.resolveAppiumHome('/somewhere')).to.eventually.equal(
            env.DEFAULT_APPIUM_HOME
          );
        });
      });

      describe('when `package.json` not found', function () {
        beforeEach(function () {
          MockPkgDir.resolves(undefined);
        });

        it('should resolve with DEFAULT_APPIUM_HOME', async function () {
          await expect(env.resolveAppiumHome('/somewhere')).to.eventually.equal(
            env.DEFAULT_APPIUM_HOME
          );
        });
      });
    });
  });

  describe('readPackageInDir()', function () {
    it('should delegate to `read-pkg`', async function () {
      await env.readPackageInDir('/somewhere');
      expect(
        MockReadPkg.readPackage.calledWithExactly({
          cwd: '/somewhere',
          normalize: true,
        })
      ).to.be.true;
    });
  });

  describe('hasAppiumDependency()', function () {
    describe('when Appium is not resolvable from cwd', function () {
      describe('when `appium` is not a dependency of the local package', function () {
        beforeEach(function () {
          MockPkgDir.resetBehavior();
          MockPkgDir.resolves(undefined);
        });

        it('should resolve `false`', async function () {
          await expect(env.hasAppiumDependency('/somewhere')).to.eventually.equal(false);
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
            await expect(env.hasAppiumDependency('/somewhere')).to.eventually.equal(false);
          });
        });
      });

      describe('when `appium` is a dependency of the local package', function () {
        describe('when `appium` is not yet actually installed', function () {
          beforeEach(function () {
            MockTeenProcess.exec.rejects(new Error());
          });

          describe('when `appium` dep is current`', function () {
            beforeEach(function () {
              MockReadPkg.readPackage.resolves({devDependencies: {appium: '2.0.0'}} as any);
            });

            it('should resolve `true`', async function () {
              await expect(env.hasAppiumDependency('/somewhere')).to.eventually.equal(true);
            });
          });

          describe('when `appium` dep is v1.x', function () {
            beforeEach(function () {
              MockReadPkg.readPackage.resolves({optionalDependencies: {appium: '1.x'}} as any);
            });
            it('should resolve `false`', async function () {
              await expect(env.hasAppiumDependency('/somewhere')).to.eventually.equal(false);
            });
          });

          describe('when `appium` dep is v0.x', function () {
            beforeEach(function () {
              MockReadPkg.readPackage.resolves({dependencies: {appium: '0.x'}} as any);
            });

            it('should resolve `false`', async function () {
              await expect(env.hasAppiumDependency('/somewhere')).to.eventually.equal(false);
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
              await expect(env.hasAppiumDependency('/somewhere')).to.eventually.equal(false);
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
              await expect(env.hasAppiumDependency('/somewhere')).to.eventually.equal(false);
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

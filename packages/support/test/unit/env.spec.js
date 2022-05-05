/* eslint-disable require-await */
// @ts-check

import path from 'path';
import {rewiremock} from '../helpers';
import {initMocks} from '../mocks';

const {expect} = chai;

describe('env', function () {
  /** @type {typeof import('../../lib/env')} */
  let env;

  /** @type {sinon.SinonSandbox} */
  let sandbox;

  /** @type {import('../mocks').MockPkgDir} */
  let MockPkgDir;

  /** @type {import('../mocks').MockReadPkg} */
  let MockReadPkg;

  /** @type {import('../mocks').MockTeenProcess} */
  let MockTeenProcess;

  /** @type {string|undefined} */
  let envAppiumHome;

  beforeEach(function () {
    let overrides;

    ({MockPkgDir, MockReadPkg, MockTeenProcess, sandbox, overrides} =
      initMocks());

    // ensure an APPIUM_HOME in the environment does not befoul our tests
    envAppiumHome = process.env.APPIUM_HOME;
    delete process.env.APPIUM_HOME;

    env = rewiremock.proxy(() => require('../../lib/env'), overrides);
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
          expect(
            await env.resolveManifestPath('/somewhere/over/the/rainbow')
          ).to.equal(
            path.join('/somewhere/over/the/rainbow', env.MANIFEST_RELATIVE_PATH)
          );
        });
      });
    });
  });

  describe('resolveAppiumHome()', function () {
    describe('when param is not absolute', function () {
      it('should reject', async function () {
        await expect(env.resolveAppiumHome('foo')).to.be.rejectedWith(
          TypeError,
          /absolute/i
        );
      });
    });

    describe('when APPIUM_HOME is set in env', function () {
      beforeEach(function () {
        process.env.APPIUM_HOME = '/some/path/to/appium';
      });

      it('should resolve APPIUM_HOME from env', async function () {
        await expect(env.resolveAppiumHome()).to.eventually.equal(
          process.env.APPIUM_HOME
        );
      });
    });

    describe('when APPIUM_HOME is not set in env', function () {
      describe('when Appium is not resolvable from cwd', function () {
        describe('when `appium` is not a dependency of the local package', function () {
          beforeEach(function () {
            // this is needed because the default behavior is `resolvesArg(0)`; `.resolves()`
            // does not override this behavior! I don't know why!
            MockPkgDir.resetBehavior();
            MockPkgDir.resolves();
          });

          it('should resolve with DEFAULT_APPIUM_HOME', async function () {
            await expect(
              env.resolveAppiumHome('/somewhere')
            ).to.eventually.equal(env.DEFAULT_APPIUM_HOME);
          });
        });

        describe('when `appium` is a dependency of the local package', function () {
          describe('when the `appium` dependency spec begins with `file:`', function () {
            beforeEach(function () {
              MockPkgDir.resolves('/some/path/to/package.json');
            });

            it('should resolve with DEFAULT_APPIUM_HOME', async function () {
              await expect(
                env.resolveAppiumHome('/somewhere')
              ).to.eventually.equal(env.DEFAULT_APPIUM_HOME);
            });
          });

          describe('when `appium` is a dependency which does not resolve to a file path`', function () {
            beforeEach(function () {
              MockTeenProcess.exec.resolves({
                stdout: JSON.stringify({
                  version: '0.0.0',
                  name: 'some-pkg',
                  dependencies: {
                    appium: {
                      version: '2.0.0-beta.25',
                      resolved: 'https://some/appium-tarball.tgz',
                    },
                  },
                }),
                stderr: '',
                code: 0,
              });
            });

            it('should resolve with the identity', async function () {
              await expect(
                env.resolveAppiumHome('/somewhere')
              ).to.eventually.equal('/somewhere');
            });
          });

          describe('when `appium` is a dependency which resolves to a file path`', function () {
            beforeEach(function () {
              MockTeenProcess.exec.resolves({
                stdout: JSON.stringify({
                  version: '0.0.0',
                  name: 'some-pkg',
                  dependencies: {
                    appium: {
                      version: '2.0.0-beta.25',
                      resolved: 'file:../some/relative/path',
                    },
                  },
                }),
                stderr: '',
                code: 0,
              });
            });
            it('should resolve with DEFAULT_APPIUM_HOME', async function () {
              await expect(
                env.resolveAppiumHome('/somewhere')
              ).to.eventually.equal(env.DEFAULT_APPIUM_HOME);
            });
          });

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
              });
            });
            it('should resolve with DEFAULT_APPIUM_HOME', async function () {
              await expect(
                env.resolveAppiumHome('/somewhere')
              ).to.eventually.equal(env.DEFAULT_APPIUM_HOME);
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
              });
            });

            it('should resolve with DEFAULT_APPIUM_HOME', async function () {
              await expect(
                env.resolveAppiumHome('/somewhere')
              ).to.eventually.equal(env.DEFAULT_APPIUM_HOME);
            });
          });
        });
      });

      describe('when reading `package.json` causes an exception', function () {
        beforeEach(function () {
          // unclear if this is even possible
          MockPkgDir.rejects(new Error('on the fritz'));
        });

        it('should resolve with DEFAULT_APPIUM_HOME', async function () {
          await expect(env.resolveAppiumHome('/somewhere')).to.eventually.equal(
            env.DEFAULT_APPIUM_HOME
          );
        });
      });

      describe('when `package.json` not found', function () {
        beforeEach(function () {
          MockPkgDir.resolves();
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
      expect(MockReadPkg).to.have.been.calledWithExactly({
        cwd: '/somewhere',
        normalize: true,
      });
    });
  });

  describe('hasAppiumDependency()', function () {
    describe('when Appium is not resolvable from cwd', function () {
      describe('when `appium` is not a dependency of the local package', function () {
        beforeEach(function () {
          // this is needed because the default behavior is `resolvesArg(0)`; `.resolves()`
          // does not override this behavior! I don't know why!
          MockPkgDir.resetBehavior();
          MockPkgDir.resolves();
        });

        it('should resolve `false``', async function () {
          await expect(
            env.hasAppiumDependency('/somewhere')
          ).to.eventually.equal(false);
        });
      });

      describe('when `appium` is a dependency of the local package', function () {
        // the tests in here are pretty barebones, since there are many variations we haven't covered (despite the LoC coverage). might be a good application for property testing.
        describe('when `appium` is not yet actually installed', function () {
          beforeEach(function () {
            MockTeenProcess.exec.rejects();
          });

          describe('when the `appium` dependency spec begins with `file:`', function () {
            beforeEach(function () {
              MockReadPkg.resolves({
                dependencies: {appium: 'file:packges/appium'},
              });
            });

            it('should resolve `false`', async function () {
              await expect(
                env.hasAppiumDependency('/somewhere')
              ).to.eventually.equal(false);
            });
          });

          describe('when `appium` dep is current`', function () {
            beforeEach(function () {
              MockReadPkg.resolves({
                devDependencies: {appium: '2.0.0'},
              });
            });

            it('should resolve `true`', async function () {
              await expect(
                env.hasAppiumDependency('/somewhere')
              ).to.eventually.equal(true);
            });
          });

          describe('when `appium` dep is v1.x', function () {
            beforeEach(function () {
              MockReadPkg.resolves({
                optionalDependencies: {appium: '1.x'},
              });
            });
            it('should resolve `false`', async function () {
              await expect(
                env.hasAppiumDependency('/somewhere')
              ).to.eventually.equal(false);
            });
          });

          describe('when `appium` dep is v0.x', function () {
            beforeEach(function () {
              MockReadPkg.resolves({
                dependencies: {appium: '0.x'},
              });
            });

            it('should resolve `false`', async function () {
              await expect(
                env.hasAppiumDependency('/somewhere')
              ).to.eventually.equal(false);
            });
          });
        });

        describe('when `appium` is installed', function () {
          describe('when `appium` is a dependency which does not resolve to a file path`', function () {
            beforeEach(function () {
              MockTeenProcess.exec.resolves({
                stdout: JSON.stringify({
                  version: '0.0.0',
                  name: 'some-pkg',
                  dependencies: {
                    appium: {
                      version: '2.0.0-beta.25',
                      resolved: 'https://some/appium-tarball.tgz',
                    },
                  },
                }),
                stderr: '',
                code: 0,
              });
            });

            it('should resolve `true`', async function () {
              await expect(
                env.hasAppiumDependency('/somewhere')
              ).to.eventually.equal(true);
            });
          });

          describe('when `appium` is a dependency which resolves to a file path`', function () {
            beforeEach(function () {
              MockTeenProcess.exec.resolves({
                stdout: JSON.stringify({
                  version: '0.0.0',
                  name: 'some-pkg',
                  dependencies: {
                    appium: {
                      version: '2.0.0-beta.25',
                      resolved: 'file:../some/relative/path',
                    },
                  },
                }),
                stderr: '',
                code: 0,
              });
            });
            it('should resolve `false`', async function () {
              await expect(
                env.hasAppiumDependency('/somewhere')
              ).to.eventually.equal(false);
            });
          });

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
              });
            });
            it('should resolve `false`', async function () {
              await expect(
                env.hasAppiumDependency('/somewhere')
              ).to.eventually.equal(false);
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
              });
            });

            it('should resolve `false`', async function () {
              await expect(
                env.hasAppiumDependency('/somewhere')
              ).to.eventually.equal(false);
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

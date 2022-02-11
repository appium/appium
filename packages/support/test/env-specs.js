// @ts-check

import path from 'path';
import sinon from 'sinon';
import { rewiremock } from './helpers';

const {expect} = chai;

describe('env', function () {
  /** @type {typeof import('../lib/env')} */
  let env;

  /** @type {import('sinon').SinonSandbox} */
  let sandbox;

  /**
   * @type { {'read-pkg': SinonStub<any[],Promise<any>>, 'resolve-from': SinonStub<any[],string>, '../lib/fs.js': { exists: SinonStub<any[],Promise<boolean>> } } }
   */
  let mocks;

  /** @type {string|undefined} */
  let envAppiumHome;

  /**
   * @type {import('type-fest').PackageJson}
   */
  let pkg;

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    // ensure an APPIUM_HOME in the environment does not befoul our tests
    envAppiumHome = process.env.APPIUM_HOME;
    delete process.env.APPIUM_HOME;

    pkg = {};
    mocks = {
      'read-pkg': sandbox.stub().resolves(pkg),
      'resolve-from': sandbox.stub().returns('/some/path/to/package.json'),
      '../lib/fs.js': {
        exists: sandbox.stub().resolves(false),
      },
    };
    env = rewiremock.proxy(() => require('../lib/env'), mocks);
  });

  describe('resolveManifestPath()', function () {
    describe('when appium is resolvable from cwd', function () {
      it('should return a path relative to cwd', async function () {
        expect(await env.resolveManifestPath()).to.equal(
          path.join(process.cwd(), env.MANIFEST_RELATIVE_PATH),
        );
      });
    });

    describe('when appium is not resolvable from cwd', function () {
      beforeEach(function () {
        mocks['resolve-from'].throws();
      });

      it('should return a path relative to the default APPIUM_HOME', async function () {
        expect(await env.resolveManifestPath()).to.equal(
          path.join(env.DEFAULT_APPIUM_HOME, env.MANIFEST_RELATIVE_PATH),
        );
      });
    });

    describe('when provided an explicit APPIUM_HOME', function () {
      describe('when a manifest file exists there', function () {
        beforeEach(function () {
          mocks['../lib/fs.js'].exists.resolves(true);
        });

        it('it should return the existing path', async function () {
          expect(
            await env.resolveManifestPath('/somewhere/over/the/rainbow'),
          ).to.equal(
            path.join(
              '/somewhere/over/the/rainbow',
              env.MANIFEST_RELATIVE_PATH,
            ),
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
          /absolute/i,
        );
      });
    });

    describe('when APPIUM_HOME is set in env', function () {
      beforeEach(function () {
        process.env.APPIUM_HOME = '/some/path/to/appium';
      });

      it('should resolve APPIUM_HOME from env', async function () {
        await expect(env.resolveAppiumHome()).to.eventually.equal(
          process.env.APPIUM_HOME,
        );
      });
    });

    describe('when APPIUM_HOME is not set in env', function () {
      describe('when Appium is resolvable from cwd', function () {
        beforeEach(function () {
          mocks['resolve-from'].returns('/some/path/to/appium/main.js');
        });

        it('should resolve with the identity', async function () {
          await expect(env.resolveAppiumHome('/somewhere')).to.eventually.equal(
            '/somewhere',
          );
        });

        describe('when no parameter provided', function () {
          it('should resolve with cwd', async function () {
            await expect(env.resolveAppiumHome()).to.eventually.equal(
              process.cwd(),
            );
          });
        });
      });

      describe('when Appium is not resolvable from cwd', function () {
        beforeEach(function () {
          mocks['resolve-from'].throws();
        });

        describe('when `appium` is not a dependency of the local package', function () {
          it('should resolve with DEFAULT_APPIUM_HOME', async function () {
            await expect(
              env.resolveAppiumHome('/somewhere'),
            ).to.eventually.equal(env.DEFAULT_APPIUM_HOME);
          });
        });

        describe('when `appium` is a dependency of the local package', function () {
          describe('when the `appium` dependency spec begins with `file:`', function () {
            beforeEach(function () {
              mocks['read-pkg'].resolves({
                dependencies: {
                  appium: 'file:/somewhere',
                },
              });
            });

            it('should resolve with DEFAULT_APPIUM_HOME', async function () {
              await expect(
                env.resolveAppiumHome('/somewhere'),
              ).to.eventually.equal(env.DEFAULT_APPIUM_HOME);
            });
          });

          describe('when the `appium` dependency spec does not begin with `file:`', function () {
            beforeEach(function () {
              mocks['read-pkg'].resolves({
                dependencies: {
                  appium: 'next',
                },
              });
            });

            it('should resolve with the identity', async function () {
              await expect(
                env.resolveAppiumHome('/somewhere'),
              ).to.eventually.equal('/somewhere');
            });
          });
        });
      });

      describe('when package.json cannot be read (for whatever reason)', function () {
        beforeEach(function () {
          mocks['read-pkg'].rejects(new Error('on the fritz'));
        });

        it('should resolve with DEFAULT_APPIUM_HOME', async function () {
          await expect(env.resolveAppiumHome('/somewhere')).to.eventually.equal(
            env.DEFAULT_APPIUM_HOME,
          );
        });
      });
    });
  });

  afterEach(function () {
    sandbox.restore();
    process.env.APPIUM_HOME = envAppiumHome;
  });
});

/**
 * @template P,R
 * @typedef {import('sinon').SinonStub<P,R>} SinonStub<P,R>
 */

/* eslint-disable require-await */
// @ts-check

/**
 * A collection of mocks reused across unit tests.
 */

import path from 'path';
import { createSandbox } from 'sinon';

export function initMocks (sandbox = createSandbox()) {
  /**
   * Mocks for package `@appium/support`
   * @type {MockAppiumSupport}
   */
  const MockAppiumSupport = {
    fs: {
      readFile: /** @type {MockAppiumSupportFs['readFile']} */ (
        sandbox.stub().resolves('{}')
      ),
      writeFile: /** @type {MockAppiumSupportFs['writeFile']} */ (
        sandbox.stub().resolves(true)
      ),
      walk: /** @type {MockAppiumSupportFs['walk']} */ (
        sandbox.stub().returns({
          [Symbol.asyncIterator]: sandbox
            .stub()
            .returns({next: sandbox.stub().resolves({done: true})}),
        })
      ),
    },
    mkdirp: /** @type {MockAppiumSupport['mkdirp']} */ (
      sandbox.stub().resolves()
    ),
    env: {
      resolveAppiumHome:
      /** @type {MockAppiumSupportEnv['resolveAppiumHome']} */ (
        sandbox.stub().resolves('/some/path')
      ),
      resolveManifestPath:
      /** @type {MockAppiumSupportEnv['resolveManifestPath']} */ (
        sandbox.stub().resolves('/some/path/extensions.yaml')
      ),
      hasAppiumDependency:
      /** @type {MockAppiumSupportEnv['hasAppiumDependency']} */ (
        sandbox.stub().resolves(false)
      ),
      readPackageInDir:
      /** @type {MockAppiumSupportEnv['readPackageInDir']} */ (
        sandbox
            .stub()
            .callsFake(async () => MockAppiumSupport.env.__pkg)
      ),
      __pkg: {
        name: 'mock-package',
        version: '1.0.0',
        readme: '# Mock Package!!',
        _id: 'mock-package',
      },
    },
    logger: {
      getLogger: /** @type {MockAppiumSupportLogger['getLogger']} */ (
        sandbox
          .stub()
          .returns(
            sandbox.stub(
              new global.console.Console(process.stdout, process.stderr),
            ),
          )
      ),
    },
  };

  /**
   * Mocks for package `package-changed`
   * @type {MockPackageChanged}
   */
  const MockPackageChanged = {
    isPackageChanged: /** @type {MockPackageChanged['isPackageChanged']} */ (
      sandbox.stub().callsFake(async () => ({
        isChanged: true,
        writeHash: MockPackageChanged.__writeHash,
        hash: 'some-hash',
        oldHash: 'some-old-hash',
      }))
    ),
    // exposing this for testing purposes
    __writeHash: sandbox.stub(),
  };

  const MockResolveFrom = /** @type {MockResolveFrom} */ (
    sandbox.stub().callsFake((cwd, id) => path.join(cwd, id))
  );

  /** @type {Overrides} */
  const overrides = {
    '@appium/support': MockAppiumSupport,
    'resolve-from': MockResolveFrom,
    'package-changed': MockPackageChanged,
  };

  return {
    MockAppiumSupport,
    MockPackageChanged,
    MockResolveFrom,
    sandbox,
    overrides,
  };
}

/**
 * Mock of package `@appium/support`
 * @typedef {Object} MockAppiumSupport
 * @property {sinon.SinonStub<[string], Promise<void>>} mkdirp
 * @property {MockAppiumSupportLogger} logger
 * @property {MockAppiumSupportFs} fs
 * @property {MockAppiumSupportEnv} env
 */

/**
 * Mock of package `@appium/support`'s `logger` module
 * @typedef {Object} MockAppiumSupportLogger
 * @property {sinon.SinonStub<[string?], typeof console>} getLogger
 */

/**
 * Mock of package `@appium/support`'s `fs` module
 * @typedef {Object} MockAppiumSupportFs
 * @property {sinon.SinonStubbedMember<import('fs/promises')['readFile']>} readFile
 * @property {sinon.SinonStubbedMember<import('fs/promises')['writeFile']>} writeFile
 * @property {sinon.SinonStubbedMember<import('klaw')>} walk
 */

/**
 * Mock of package `@appium/support`'s `env` module.
 * @typedef {Object} MockAppiumSupportEnv
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/env').resolveAppiumHome>} resolveAppiumHome
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/env').resolveManifestPath>} resolveManifestPath
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/env').readPackageInDir>} readPackageInDir
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/env').hasAppiumDependency>} hasAppiumDependency
 * @property {import('@appium/support/lib/env').NormalizedPackageJson} __pkg
 */

/**
 * Mock of package `package-changed`
 * @typedef {Object} MockPackageChanged
 * @property {sinon.SinonStubbedMember<import('package-changed').isPackageChanged>} isPackageChanged
 * @property {sinon.SinonStub<never, void>} __writeHash
 */

/**
 * Mock of package `resolve-from`
 * @typedef {sinon.SinonStubbedMember<import('resolve-from')>} MockResolveFrom
 */

/**
 * For passing into `rewiremock.proxy()`
 * @typedef { { '@appium/support': MockAppiumSupport, 'resolve-from': MockResolveFrom, 'package-changed': MockPackageChanged } } Overrides
 */

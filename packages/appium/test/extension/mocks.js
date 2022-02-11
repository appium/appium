// @ts-check

/**
 * A collection of mocks reused across unit tests.
 */

import path from 'path';
import { createSandbox } from 'sinon';

export function initMocks (sandbox = createSandbox()) {
  /**
   * Mocks for package `@appium/support`
   * @type {AppiumSupportMocks}
   */
  const AppiumSupportMocks = {
    fs: {
      readFile: /** @type {AppiumSupportFsMocks['readFile']} */ (
        sandbox.stub().resolves('{}')
      ),
      writeFile: /** @type {AppiumSupportFsMocks['writeFile']} */ (
        sandbox.stub().resolves(true)
      ),
      walk: /** @type {AppiumSupportFsMocks['walk']} */ (
        sandbox.stub().returns({
          [Symbol.asyncIterator]: sandbox
            .stub()
            .returns({next: sandbox.stub().resolves({done: true})}),
        })
      ),
    },
    mkdirp: /** @type {AppiumSupportMocks['mkdirp']} */ (
      sandbox.stub().resolves()
    ),
    env: {
      resolveAppiumHome:
      /** @type {AppiumSupportEnvMocks['resolveAppiumHome']} */ (
        sandbox.stub().resolves('/some/path')
      ),
      resolveManifestPath:
      /** @type {AppiumSupportEnvMocks['resolveManifestPath']} */ (
        sandbox.stub().resolves('/some/path/extensions.yaml')
      ),
      readPackageInDir:
      /** @type {AppiumSupportEnvMocks['readPackageInDir']} */ (
        sandbox
            .stub()
            .resolves({name: 'my-package', version: '1.0.0', appium: {}})
      ),
      isLocalAppiumInstalled:
      /** @type {AppiumSupportEnvMocks['isLocalAppiumInstalled']} */ (
        sandbox.stub().returns(false)
      ),
    },
    logger: {
      getLogger: /** @type {AppiumSupportLoggerMocks['getLogger']} */ (
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
   * @type {PackageChangedMocks}
   */
  const PackageChangedMocks = {
    isPackageChanged: /** @type {PackageChangedMocks['isPackageChanged']} */ (
      sandbox.stub().callsFake(
        async () =>
          await {
            isChanged: true,
            writeHash: PackageChangedMocks.__writeHash,
            hash: 'some-hash',
            oldHash: 'some-old-hash',
          },
      )
    ),
    // exposing this for testing purposes
    __writeHash: sandbox.stub(),
  };

  const ResolveFromMocks = /** @type {ResolveFromMocks} */ (
    sandbox.stub().callsFake((cwd, id) => path.join(cwd, id))
  );

  return {AppiumSupportMocks, PackageChangedMocks, ResolveFromMocks, sandbox};
}

/**
 * @typedef {Object} AppiumSupportMocks
 * @property {sinon.SinonStub<[string], Promise<void>>} mkdirp
 * @property {AppiumSupportLoggerMocks} logger
 * @property {AppiumSupportFsMocks} fs
 * @property {AppiumSupportEnvMocks} env
 */

/**
 * @typedef {Object} AppiumSupportLoggerMocks
 * @property {sinon.SinonStub<[string?], typeof console>} getLogger
 */

/**
 * @typedef {Object} AppiumSupportFsMocks
 * @property {sinon.SinonStubbedMember<import('fs/promises')['readFile']>} readFile
 * @property {sinon.SinonStubbedMember<import('fs/promises')['writeFile']>} writeFile
 * @property {sinon.SinonStubbedMember<import('klaw')>} walk
 */

/**
 * @typedef {Object} AppiumSupportEnvMocks
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/env').resolveAppiumHome>} resolveAppiumHome
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/env').resolveManifestPath>} resolveManifestPath
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/env').readPackageInDir>} readPackageInDir
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/env').isLocalAppiumInstalled>} isLocalAppiumInstalled
 */

/**
 * @typedef {Object} PackageChangedMocks
 * @property {sinon.SinonStubbedMember<import('package-changed').isPackageChanged>} isPackageChanged
 * @property {sinon.SinonStub<never, void>} __writeHash
 */

/**
 * @typedef {sinon.SinonStubbedMember<import('resolve-from')>} ResolveFromMocks
 */

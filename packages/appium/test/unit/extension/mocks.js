/* eslint-disable require-await */
// @ts-check

/**
 * A collection of mocks reused across unit tests.
 */

import path from 'path';
import {createSandbox} from 'sinon';
import {version as APPIUM_VER} from '../../../package.json';

export function initMocks(sandbox = createSandbox()) {
  /**
   * Mocks for package `@appium/support`
   * @type {MockAppiumSupport}
   */
  const MockAppiumSupport = {
    fs: {
      readFile: /** @type {MockAppiumSupportFs['readFile']} */ (sandbox.stub().resolves('{}')),
      writeFile: /** @type {MockAppiumSupportFs['writeFile']} */ (sandbox.stub().resolves(true)),
      walk: /** @type {MockAppiumSupportFs['walk']} */ (
        sandbox.stub().returns({
          [Symbol.asyncIterator]: sandbox
            .stub()
            .returns({next: sandbox.stub().resolves({done: true})}),
        })
      ),
      mkdirp: /** @type {MockAppiumSupportFs['mkdirp']} */ (sandbox.stub().resolves()),
      readPackageJsonFrom: /** @type {MockAppiumSupportFs['readPackageJsonFrom']} */ (
        sandbox.stub().returns({version: APPIUM_VER, engines: {node: '>=12'}})
      ),
      findRoot: /** @type {MockAppiumSupportFs['findRoot']} */ (
        sandbox.stub().returns(path.join(__dirname, '..', '..', '..'))
      ),
    },
    env: {
      resolveAppiumHome: /** @type {MockAppiumSupportEnv['resolveAppiumHome']} */ (
        sandbox.stub().resolves('/some/path')
      ),
      resolveManifestPath: /** @type {MockAppiumSupportEnv['resolveManifestPath']} */ (
        sandbox.stub().resolves('/some/path/extensions.yaml')
      ),
      hasAppiumDependency: /** @type {MockAppiumSupportEnv['hasAppiumDependency']} */ (
        sandbox.stub().resolves(false)
      ),
      readPackageInDir: /** @type {MockAppiumSupportEnv['readPackageInDir']} */ (
        sandbox.stub().callsFake(async () => MockAppiumSupport.env.__pkg)
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
        sandbox.stub().callsFake(() => MockAppiumSupport.logger.__logger)
      ),
      __logger: sandbox.stub(new global.console.Console(process.stdout, process.stderr)),
    },
    system: {
      isWindows: /** @type {MockAppiumSupportSystem['isWindows']} */ (
        sandbox.stub().returns(false)
      ),
    },
    npm: {
      getLatestVersion: /** @type {MockAppiumSupportNpm['getLatestVersion']} */ (
        sandbox.stub().resolves('2.0.0')
      ),
      getLatestSafeUpgradeVersion:
        /** @type {MockAppiumSupportNpm['getLatestSafeUpgradeVersion']} */ (
          sandbox.stub().resolves('1.1.0')
        ),
    },
    util: {
      compareVersions: /** @type {MockAppiumSupportUtil['compareVersions']} */ (
        sandbox.stub().returns(true)
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
 * @typedef MockAppiumSupport
 * @property {MockAppiumSupportLogger} logger
 * @property {MockAppiumSupportFs} fs
 * @property {MockAppiumSupportEnv} env
 * @property {MockAppiumSupportSystem} system
 * @property {MockAppiumSupportNpm} npm
 * @property {MockAppiumSupportUtil} util
 */

/**
 * Mock of package `@appium/support`'s `logger` module
 * @typedef MockAppiumSupportLogger
 * @property {sinon.SinonStub<[string?], Console>} getLogger
 * @property {sinon.SinonStubbedInstance<Console>} __logger
 */

/**
 * Mock of package `@appium/support`'s `fs` module
 * @typedef MockAppiumSupportFs
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/fs')['fs']['readFile']>} readFile
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/fs')['fs']['writeFile']>} writeFile
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/fs')['fs']['walk']>} walk
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/fs')['fs']['mkdirp']>} mkdirp
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/fs')['fs']['readPackageJsonFrom']>} readPackageJsonFrom
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/fs')['fs']['findRoot']>} findRoot
 */

/**
 * Mock of package `@appium/support`'s `env` module.
 * @typedef MockAppiumSupportEnv
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/env').resolveAppiumHome>} resolveAppiumHome
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/env').resolveManifestPath>} resolveManifestPath
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/env').readPackageInDir>} readPackageInDir
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/env').hasAppiumDependency>} hasAppiumDependency
 * @property {import('@appium/support/lib/env').NormalizedPackageJson} __pkg
 */

/**
 * @typedef MockAppiumSupportSystem
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/system').isWindows>} isWindows
 */

/**
 * @typedef MockAppiumSupportNpm
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/npm').NPM['getLatestVersion']>} getLatestVersion
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/npm').NPM['getLatestSafeUpgradeVersion']>} getLatestSafeUpgradeVersion
 */

/**
 * @typedef MockAppiumSupportUtil
 * @property {sinon.SinonStubbedMember<import('@appium/support/lib/util').compareVersions>} compareVersions
 */

/**
 * Mock of package `package-changed`
 * @typedef MockPackageChanged
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

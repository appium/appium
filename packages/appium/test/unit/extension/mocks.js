/* eslint-disable require-await */

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
      pluralize: require('pluralize'),
    },
    console: {
      CliConsole: /** @type {MockAppiumSupportConsole['CliConsole']} */ (
        sandbox
          .stub()
          .returns(sandbox.createStubInstance(require('@appium/support').console.CliConsole))
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
 * @property {MockAppiumSupportConsole} console
 */

/**
 * Mock of package `@appium/support`'s `logger` module
 * @typedef MockAppiumSupportLogger
 * @property {SinonStub<[string?], Console>} getLogger
 * @property {SinonStubbedInstance<Console>} __logger
 */

/**
 * Mock of package `@appium/support`'s `fs` module
 * @typedef MockAppiumSupportFs
 * @property {SinonStubbedMember<SupportFs['readFile']>} readFile
 * @property {SinonStubbedMember<SupportFs['writeFile']>} writeFile
 * @property {SinonStubbedMember<SupportFs['walk']>} walk
 * @property {SinonStubbedMember<SupportFs['mkdirp']>} mkdirp
 * @property {SinonStubbedMember<SupportFs['readPackageJsonFrom']>} readPackageJsonFrom
 * @property {SinonStubbedMember<SupportFs['findRoot']>} findRoot
 */

/**
 * Mock of package `@appium/support`'s `env` module.
 * @typedef MockAppiumSupportEnv
 * @property {SinonStubbedMember<SupportEnv['resolveAppiumHome']>} resolveAppiumHome
 * @property {SinonStubbedMember<SupportEnv['resolveManifestPath']>} resolveManifestPath
 * @property {SinonStubbedMember<SupportEnv['readPackageInDir']>} readPackageInDir
 * @property {SinonStubbedMember<SupportEnv['hasAppiumDependency']>} hasAppiumDependency
 * @property {import('@appium/support/lib/env').NormalizedPackageJson} __pkg
 */

/**
 * @typedef MockAppiumSupportSystem
 * @property {SinonStubbedMember<SupportSystem['isWindows']>} isWindows
 */

/**
 * @typedef MockAppiumSupportNpm
 * @property {SinonStubbedMember<SupportNpm['getLatestVersion']>} getLatestVersion
 * @property {SinonStubbedMember<SupportNpm['getLatestSafeUpgradeVersion']>} getLatestSafeUpgradeVersion
 */

/**
 * @typedef MockAppiumSupportUtil
 * @property {SinonStubbedMember<SupportUtil['compareVersions']>} compareVersions
 * @property {import('pluralize')} pluralize
 */

/**
 * Mock of package `package-changed`
 * @typedef MockPackageChanged
 * @property {SinonStubbedMember<import('package-changed').isPackageChanged>} isPackageChanged
 * @property {SinonStub<never, void>} __writeHash
 */

/**
 * Mock of package `resolve-from`
 * @typedef {SinonStubbedMember<import('resolve-from')>} MockResolveFrom
 */

/**
 * For passing into `rewiremock.proxy()`
 * @typedef { { '@appium/support': MockAppiumSupport, 'resolve-from': MockResolveFrom, 'package-changed': MockPackageChanged } } Overrides
 */

/**
 * @typedef MockAppiumSupportConsole
 * @property {SinonStubbedMember<Omit<SupportConsole['CliConsole'], 'symbolToColor'>>} CliConsole
 */

/**
 * @template T
 * @typedef {import('sinon').SinonStubbedInstance<T>} SinonStubbedInstance
 */

/**
 * @template T,U
 * @typedef {import('sinon').SinonStub<T,U>} SinonStub
 */

/**
 * @template T
 * @typedef {import('sinon').SinonStubbedMember<T>} SinonStubbedMember
 */

/**
 * @typedef {import('@appium/support').fs} SupportFs
 * @typedef {import('@appium/support').env} SupportEnv
 * @typedef {import('@appium/support').npm} SupportNpm
 * @typedef {import('@appium/support').system} SupportSystem
 * @typedef {import('@appium/support').util} SupportUtil
 * @typedef {import('@appium/support').console} SupportConsole
 */

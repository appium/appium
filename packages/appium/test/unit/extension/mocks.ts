/**
 * A collection of mocks reused across unit tests.
 */

import path from 'node:path';
import {mock} from 'node:test';

import * as support from '@appium/support';
import {console as supportConsole, util as supportUtil} from '@appium/support';
import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';

import {PKG_HASHFILE_RELATIVE_PATH} from '../../../lib/constants.js';
import * as utils from '../../../lib/utils/index.js';

export interface MockAppiumSupportFs {
  readFile: SinonStub;
  writeFile: SinonStub;
  walk: SinonStub;
  glob: SinonStub;
  mkdirp: SinonStub;
  exists: SinonStub;
  realpath: SinonStub;
}

export interface MockAppiumSupportEnv {
  resolveAppiumHome: SinonStub;
  resolveManifestPath: SinonStub;
  hasAppiumDependency: SinonStub;
}

export interface MockAppiumSupportLogger {
  getLogger: SinonStub;
  __logger: SinonStub;
}

export interface MockAppiumSupportSystem {
  isWindows: SinonStub;
}

export interface MockAppiumSupportNpm {
  getLatestVersion: SinonStub;
  getLatestSafeUpgradeVersion: SinonStub;
}

export type MockAppiumSupportUtil = typeof supportUtil & {
  compareVersions: SinonStub;
};

export interface MockAppiumSupportConsole {
  CliConsole: SinonStub;
}

export interface MockAppiumSupport {
  fs: MockAppiumSupportFs;
  env: MockAppiumSupportEnv;
  logger: MockAppiumSupportLogger;
  system: MockAppiumSupportSystem;
  npm: MockAppiumSupportNpm;
  util: MockAppiumSupportUtil;
  console: MockAppiumSupportConsole;
}

export interface MockPackageChanged {
  isPackageChanged: SinonStub;
  __writeHash: SinonStub;
}

export interface MockResolveFrom extends SinonStub<[cwd: string, id: string], Promise<string>> {
  (cwd: string, id: string): Promise<string>;
}

export interface InitMocksResult {
  MockAppiumSupport: MockAppiumSupport;
  MockPackageChanged: MockPackageChanged;
  MockResolveFrom: MockResolveFrom;
  sandbox: SinonSandbox;
}

export function initMocks(sandbox = createSandbox()): InitMocksResult {
  const MockAppiumSupport: MockAppiumSupport = {
    fs: {
      readFile: sandbox.stub().resolves('{}'),
      writeFile: sandbox.stub().resolves(true),
      walk: sandbox.stub().returns({
        [Symbol.asyncIterator]: sandbox.stub().returns({next: sandbox.stub().resolves({done: true})}),
      }),
      glob: sandbox.stub().resolves([]),
      mkdirp: sandbox.stub().resolves(),
      exists: sandbox.stub().resolves(true),
      realpath: sandbox.stub().callsFake(async (p: string) => p),
    },
    env: {
      resolveAppiumHome: sandbox.stub().resolves('/some/path'),
      resolveManifestPath: sandbox.stub().resolves('/some/path/extensions.yaml'),
      hasAppiumDependency: sandbox.stub().resolves(false),
    },
    logger: {
      getLogger: sandbox.stub().callsFake(() => MockAppiumSupport.logger.__logger),
      __logger: sandbox.stub(
        new (global as typeof globalThis & {console: typeof console}).console.Console(process.stdout, process.stderr),
      ) as unknown as SinonStub,
    },
    system: {
      isWindows: sandbox.stub().returns(false),
    },
    npm: {
      getLatestVersion: sandbox.stub().resolves('2.0.0'),
      getLatestSafeUpgradeVersion: sandbox.stub().resolves('1.1.0'),
    },
    util: {
      ...supportUtil,
      compareVersions: sandbox.stub().returns(true),
    },
    console: {
      CliConsole: sandbox.stub().returns(sandbox.createStubInstance(supportConsole.CliConsole)),
    },
  };

  const MockPackageChanged: MockPackageChanged = {
    isPackageChanged: sandbox.stub().callsFake(async () => ({
      isChanged: true,
      writeHash: MockPackageChanged.__writeHash,
      hash: 'some-hash',
      oldHash: 'some-old-hash',
    })),
    __writeHash: sandbox.stub(),
  };

  const MockResolveFrom: MockResolveFrom = sandbox
    .stub<[cwd: string, id: string], Promise<string>>()
    .callsFake(async (cwd, id) => path.join(cwd, id));

  return {
    MockAppiumSupport,
    MockPackageChanged,
    MockResolveFrom,
    sandbox,
  };
}

/**
 * Restores the stub behaviors {@link initMocks} originally configured, and clears call
 * history — without replacing the stub objects themselves. Because `t.mock.module()` binds
 * the module-under-test to these exact stub objects once (see {@link applyExtensionMocks}),
 * per-test cleanup must reconfigure them in place rather than create new ones.
 */
export function resetMockDefaults(mocks: InitMocksResult): void {
  mocks.sandbox.resetHistory();
  const {MockAppiumSupport, MockPackageChanged, MockResolveFrom} = mocks;
  MockAppiumSupport.fs.readFile.resolves('{}');
  MockAppiumSupport.fs.writeFile.resolves(true);
  MockAppiumSupport.fs.walk.returns({
    [Symbol.asyncIterator]: mocks.sandbox.stub().returns({next: mocks.sandbox.stub().resolves({done: true})}),
  });
  MockAppiumSupport.fs.glob.resolves([]);
  MockAppiumSupport.fs.mkdirp.resolves();
  MockAppiumSupport.fs.exists.resolves(true);
  MockAppiumSupport.env.resolveAppiumHome.resolves('/some/path');
  MockAppiumSupport.env.resolveManifestPath.resolves('/some/path/extensions.yaml');
  MockAppiumSupport.env.hasAppiumDependency.resolves(false);
  MockAppiumSupport.logger.getLogger.callsFake(() => MockAppiumSupport.logger.__logger);
  MockAppiumSupport.system.isWindows.returns(false);
  MockAppiumSupport.npm.getLatestVersion.resolves('2.0.0');
  MockAppiumSupport.npm.getLatestSafeUpgradeVersion.resolves('1.1.0');
  MockAppiumSupport.util.compareVersions.returns(true);
  MockAppiumSupport.console.CliConsole.returns(mocks.sandbox.createStubInstance(supportConsole.CliConsole));
  MockPackageChanged.isPackageChanged.callsFake(async () => ({
    isChanged: true,
    writeHash: MockPackageChanged.__writeHash,
    hash: 'some-hash',
    oldHash: 'some-old-hash',
  }));
  MockResolveFrom.callsFake(async (cwd, id) => path.join(cwd, id));
}

/**
 * Mocks `@appium/support` and `lib/utils/index.js` for the module-under-test, using the mocks
 * from {@link initMocks}. Call once from a suite's `before()` hook — `before()` only gets a
 * `SuiteContext`, which has no `.mock`, so this uses the standalone `mock` export instead of
 * `t.mock`. That tracker isn't scoped to one test and doesn't auto-restore, so pair this with
 * `after(() => mock.reset())` in the same file to avoid leaking the mock into other spec files
 * (all spec files share one process/module registry under `node --test`). Call from a spec
 * file in `test/unit/extension/` (the relative specifiers below are resolved from this file's
 * own location, which is the same directory).
 *
 * Mocks `lib/utils/index.js` (the barrel) rather than `resolve-from.js`/`is-package-changed.js`
 * directly: `extension-config.ts` et al. import `resolveFrom` through that barrel, and a
 * barrel's re-export is a live binding resolved at the barrel's own link time — mocking the
 * leaf file doesn't retroactively change a barrel that's already linked.
 *
 * IMPORTANT — this only works if the file that directly imports the mocked module (e.g.
 * `extension-config.js`, which imports `resolveFrom`/`@appium/support`) has never itself been
 * linked before `mock.module()` runs. It is fine if `@appium/support`/`utils/index.js`
 * themselves were already loaded elsewhere (e.g. transitively via `test/helpers.ts`) — Node
 * still redirects any *new* linking of a consumer to the mocked registry entry. What breaks it
 * is a *static* top-level import in the spec file that itself statically imports the direct
 * consumer (e.g. `import {Manifest} from '.../manifest.js'`, since `manifest.ts` directly
 * imports `extension-config.js`) — that import resolves before this file's own `before()` hook
 * runs, permanently binding the consumer to the real, unmocked dependencies. When a spec file
 * needs such a module, import it dynamically inside `before()`, after calling this function,
 * rather than as a static top-level import.
 */
export function applyExtensionMocks(mocks: InitMocksResult): void {
  // `default` is destructured out: on Node 22, passing a `default` key through
  // `namedExports` makes `mock.module()` generate invalid synthetic module source.
  const {default: _unusedDefault, ...supportWithoutDefault} = support;
  mock.module('@appium/support', {
    namedExports: {...supportWithoutDefault, ...mocks.MockAppiumSupport},
  });
  mock.module('../../../lib/utils/index.js', {
    namedExports: {
      ...utils,
      resolveFrom: mocks.MockResolveFrom,
      isPackageChanged: mocks.MockPackageChanged.isPackageChanged,
      // `utils/index.js` re-exports `packageDidChange` from `package-changed.ts`, whose own
      // `fs`/`isPackageChanged` imports are unavoidably poisoned (bound to the real, unmocked
      // `@appium/support`) — `test/helpers.ts` (statically imported by every spec file) reaches
      // `capability.ts`, which imports this same barrel, evaluating `package-changed.ts` for
      // real before any test's `before()` hook can run. Replacing `packageDidChange` outright
      // (mirroring its real logic against the mock objects directly) sidesteps that rather than
      // fighting it.
      packageDidChange: async (appiumHome: string) => {
        const hashFilename = path.join(appiumHome, PKG_HASHFILE_RELATIVE_PATH);
        const hashFilenameDir = path.dirname(hashFilename);
        try {
          await mocks.MockAppiumSupport.fs.mkdirp(hashFilenameDir);
        } catch (err) {
          throw new Error(
            `Appium could not create the directory for hash file: ${hashFilenameDir}. Original error: ${(err as Error).message}`,
            {cause: err},
          );
        }
        const {isChanged, writeHash} = await mocks.MockPackageChanged.isPackageChanged({
          cwd: appiumHome,
          hashFilename: PKG_HASHFILE_RELATIVE_PATH,
        });
        if (isChanged) {
          await writeHash();
        }
        return isChanged;
      },
    },
  });
}

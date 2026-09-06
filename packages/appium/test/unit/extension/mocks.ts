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

/** Stubs for `resolveAppiumHome`/`resolveManifestPath`/`hasAppiumDependency`, mocked onto `lib/utils/index.js` (not `@appium/support` — they live in `lib/utils/env.ts`). */
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

/** Stubs for `npm.getLatestVersion`/`getLatestSafeUpgradeVersion`, mocked onto `lib/utils/index.js` (not `@appium/support` — `npm` lives in `lib/utils/npm.ts`). */
export interface MockNpm {
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
  MockNpm: MockNpm;
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

  const MockNpm: MockNpm = {
    getLatestVersion: sandbox.stub().resolves('2.0.0'),
    getLatestSafeUpgradeVersion: sandbox.stub().resolves('1.1.0'),
  };

  return {
    MockAppiumSupport,
    MockPackageChanged,
    MockResolveFrom,
    MockNpm,
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
  const {MockAppiumSupport, MockPackageChanged, MockResolveFrom, MockNpm} = mocks;
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
  MockNpm.getLatestVersion.resolves('2.0.0');
  MockNpm.getLatestSafeUpgradeVersion.resolves('1.1.0');
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
 * Mocks `@appium/support` and the `lib/utils/index.js` barrel (not `npm.js`/`is-package-changed.js`
 * directly — a barrel re-export is a live binding resolved at the barrel's own link time, so
 * mocking a leaf file doesn't retroactively change an already-linked barrel), using the mocks
 * from {@link initMocks}.
 *
 * Call once from a suite's `before()` (which has no `t.mock`, hence the standalone `mock` export)
 * in a spec file under `test/unit/extension/`, and pair with `after(() => mock.reset())` — the
 * tracker doesn't auto-restore and spec files share one module registry under `node --test`.
 *
 * Only works if the module that directly imports the mocked dependency (e.g. `extension-config.js`)
 * hasn't been linked yet. A *static* top-level import of such a consumer in the spec file (e.g.
 * `Manifest` from `manifest/manifest.js`, which imports `extension-config.js`) resolves before
 * this function's `before()` hook runs and permanently binds it to the real dependencies —
 * import it dynamically inside `before()`, after calling this function, instead.
 */
export function applyExtensionMocks(mocks: InitMocksResult): void {
  // `default` is destructured out: on Node 22, passing a `default` key through
  // `namedExports` makes `mock.module()` generate invalid synthetic module source.
  const {default: _unusedDefault, ...supportWithoutDefault} = support;
  const {env, ...appiumSupportMocksWithoutEnv} = mocks.MockAppiumSupport;
  mock.module('@appium/support', {
    namedExports: {...supportWithoutDefault, ...appiumSupportMocksWithoutEnv},
  });
  mock.module('../../../lib/utils/index.js', {
    namedExports: {
      ...utils,
      ...env,
      resolveFrom: mocks.MockResolveFrom,
      npm: mocks.MockNpm,
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

/**
 * A collection of mocks reused across unit tests.
 */

import {EventEmitter} from 'node:events';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';
import pluralize from 'pluralize';
import {console as supportConsole} from '@appium/support';

declare const __filename: string;
const requireMod = createRequire(__filename);

const {version: APPIUM_VER} = requireMod('../../../package.json') as {version: string};

export interface MockAppiumSupportFs {
  readFile: SinonStub;
  writeFile: SinonStub;
  walk: SinonStub;
  glob: SinonStub;
  mkdirp: SinonStub;
  readPackageJsonFrom: SinonStub;
  findRoot: SinonStub;
  exists: SinonStub;
}

export interface MockAppiumSupportEnv {
  resolveAppiumHome: SinonStub;
  resolveManifestPath: SinonStub;
  hasAppiumDependency: SinonStub;
  readPackageInDir: SinonStub;
  __pkg: {name: string; version: string; readme: string; _id: string};
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

export interface MockAppiumSupportUtil {
  compareVersions: SinonStub;
  pluralize: typeof pluralize;
}

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

export interface MockResolveFrom extends SinonStub {
  (cwd: string, id: string): string;
}

export interface MockGlob extends SinonStub {
  (spec: string, opts: {cwd: string}, done: () => void): EventEmitter;
}

export interface Overrides {
  '@appium/support': MockAppiumSupport;
  'resolve-from': MockResolveFrom;
  'package-changed': MockPackageChanged;
  glob: MockGlob;
}

export interface InitMocksResult {
  MockAppiumSupport: MockAppiumSupport;
  MockPackageChanged: MockPackageChanged;
  MockResolveFrom: MockResolveFrom;
  MockGlob: MockGlob;
  sandbox: SinonSandbox;
  overrides: Overrides;
}

export function initMocks(sandbox = createSandbox()): InitMocksResult {
  const MockAppiumSupport: MockAppiumSupport = {
    fs: {
      readFile: sandbox.stub().resolves('{}'),
      writeFile: sandbox.stub().resolves(true),
      walk: sandbox.stub().returns({
        [Symbol.asyncIterator]: sandbox
          .stub()
          .returns({next: sandbox.stub().resolves({done: true})}),
      }),
      glob: sandbox.stub().resolves([]),
      mkdirp: sandbox.stub().resolves(),
      readPackageJsonFrom: sandbox.stub().returns({
        version: APPIUM_VER,
        engines: {node: '>=12'},
      }),
      findRoot: sandbox.stub().returns(path.join(__dirname, '..', '..', '..')),
      exists: sandbox.stub().resolves(true),
    },
    env: {
      resolveAppiumHome: sandbox.stub().resolves('/some/path'),
      resolveManifestPath: sandbox.stub().resolves('/some/path/extensions.yaml'),
      hasAppiumDependency: sandbox.stub().resolves(false),
      readPackageInDir: sandbox.stub().callsFake(async () => MockAppiumSupport.env.__pkg),
      __pkg: {
        name: 'mock-package',
        version: '1.0.0',
        readme: '# Mock Package!!',
        _id: 'mock-package',
      },
    },
    logger: {
      getLogger: sandbox.stub().callsFake(() => MockAppiumSupport.logger.__logger),
      __logger: sandbox.stub(
        new (global as typeof globalThis & {console: typeof console}).console.Console(
          process.stdout,
          process.stderr
        )
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
      compareVersions: sandbox.stub().returns(true),
      pluralize,
    },
    console: {
      CliConsole: sandbox
        .stub()
        .returns(sandbox.createStubInstance(supportConsole.CliConsole)),
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

  const MockResolveFrom = sandbox.stub().callsFake((cwd: string, id: string) =>
    path.join(cwd, id)
  ) as unknown as MockResolveFrom;

  const MockGlob = sandbox.stub().callsFake((spec: string, opts: {cwd: string}, done: () => void) => {
    const ee = new EventEmitter();
    setTimeout(() => {
      ee.emit('match', path.join(opts.cwd, 'package.json'));
      setTimeout(() => {
        done();
      });
    });
    return ee;
  }) as unknown as MockGlob;

  const overrides: Overrides = {
    '@appium/support': MockAppiumSupport,
    'resolve-from': MockResolveFrom,
    'package-changed': MockPackageChanged,
    glob: MockGlob,
  };

  return {
    MockAppiumSupport,
    MockPackageChanged,
    MockResolveFrom,
    MockGlob,
    sandbox,
    overrides,
  };
}

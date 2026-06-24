/**
 * A collection of mocks reused across unit tests.
 */

import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';

/** Override key for rewiremock from `test/unit/*.spec.ts` → `lib/internal` (env imports `./internal`). */
export const INTERNAL_MODULE_OVERRIDE_KEY = '../../lib/internal' as const;
import type {NormalizedPackageJson} from '../lib/internal/read-package';

export interface MockInternal {
  readPackage: SinonStub;
  readPackageSync: SinonStub;
  packageDirectorySync: SinonStub;
  __pkg: NormalizedPackageJson;
}

/** @deprecated Use {@link MockInternal} */
export type MockReadPackage = MockInternal;

export interface MockFs {
  access: SinonStub;
}

export interface MockTeenProcess {
  exec: SinonStub;
  __stdout: string;
  __stderr: string;
  __code: number;
}

export interface Overrides {
  [INTERNAL_MODULE_OVERRIDE_KEY]: MockInternal;
  teen_process: MockTeenProcess;
  fs: MockFs;
}

export interface InitMocksResult {
  MockInternal: MockInternal;
  /** @deprecated Use {@link MockInternal} */
  MockReadPackage: MockInternal;
  MockFs: MockFs;
  MockTeenProcess: MockTeenProcess;
  sandbox: SinonSandbox;
  overrides: Overrides;
}

export function initMocks(sandbox = createSandbox()): InitMocksResult {
  const mockPkg: NormalizedPackageJson = {
    name: 'mock-package',
    version: '1.0.0',
    readme: '# Mock Package!!',
    _id: 'mock-package',
  };
  const MockInternal: MockInternal = {
    readPackage: sandbox.stub().callsFake(async () => mockPkg),
    readPackageSync: sandbox.stub().returns(mockPkg),
    packageDirectorySync: sandbox.stub().callsFake(({cwd}: {cwd?: string} = {}) => cwd),
    __pkg: mockPkg,
  };

  const MockFs: MockFs = {
    access: sandbox.stub().resolves(true),
  };

  const MockTeenProcess: MockTeenProcess = {
    exec: sandbox.stub().callsFake(async () => ({
      stdout: MockTeenProcess.__stdout,
      stderr: MockTeenProcess.__stderr,
      code: MockTeenProcess.__code,
    })) as any,
    __stdout: '',
    __stderr: '',
    __code: 0,
  };

  const overrides: Overrides = {
    [INTERNAL_MODULE_OVERRIDE_KEY]: MockInternal,
    teen_process: MockTeenProcess,
    fs: MockFs,
  };

  return {
    MockInternal,
    MockReadPackage: MockInternal,
    MockFs,
    MockTeenProcess,
    sandbox,
    overrides,
  };
}

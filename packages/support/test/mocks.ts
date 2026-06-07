/**
 * A collection of mocks reused across unit tests.
 */

import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';
import type {NormalizedPackageJson} from '../lib/internal/read-package';

export interface MockReadPackage {
  readPackage: SinonStub;
  readPackageSync: SinonStub;
  packageDirectorySync: SinonStub;
  __pkg: NormalizedPackageJson;
}

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
  '../../lib/internal/read-package': MockReadPackage;
  teen_process: MockTeenProcess;
  fs: MockFs;
}

export interface InitMocksResult {
  MockReadPackage: MockReadPackage;
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
  const MockReadPackage: MockReadPackage = {
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
    '../../lib/internal/read-package': MockReadPackage,
    teen_process: MockTeenProcess,
    fs: MockFs,
  };

  return {
    MockReadPackage,
    MockFs,
    MockTeenProcess,
    sandbox,
    overrides,
  };
}

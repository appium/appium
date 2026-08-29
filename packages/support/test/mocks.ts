/**
 * A collection of mocks reused across unit tests.
 */

import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';

import type {NormalizedPackageJson} from '../lib/internal/read-package.js';

export interface MockInternal {
  readPackage: SinonStub;
  readPackageSync: SinonStub;
  packageDirectorySync: SinonStub;
  __pkg: NormalizedPackageJson;
}

/** @deprecated Use {@link MockInternal} */
export type MockReadPackage = MockInternal;

export interface MockTeenProcess {
  exec: SinonStub;
  __stdout: string;
  __stderr: string;
  __code: number;
}

export interface InitMocksResult {
  MockInternal: MockInternal;
  /** @deprecated Use {@link MockInternal} */
  MockReadPackage: MockInternal;
  MockTeenProcess: MockTeenProcess;
  sandbox: SinonSandbox;
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

  return {
    MockInternal,
    MockReadPackage: MockInternal,
    MockTeenProcess,
    sandbox,
  };
}

/**
 * A collection of mocks reused across unit tests.
 */

import path from 'node:path';
import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';
import type {NormalizedPackageJson} from 'read-pkg';

export interface MockResolveFrom extends SinonStub {
  (cwd: string, id: string): string;
}

export interface MockPkgDir extends SinonStub {
  (...args: any[]): Promise<string | undefined>;
}

export interface MockReadPkg {
  readPackage: SinonStub;
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
  'resolve-from': MockResolveFrom;
  'read-pkg': MockReadPkg;
  'package-directory': MockPkgDir;
  teen_process: MockTeenProcess;
  fs: MockFs;
}

export interface InitMocksResult {
  MockResolveFrom: MockResolveFrom;
  MockPkgDir: MockPkgDir;
  MockReadPkg: MockReadPkg;
  MockFs: MockFs;
  MockTeenProcess: MockTeenProcess;
  sandbox: SinonSandbox;
  overrides: Overrides;
}

export function initMocks(sandbox = createSandbox()): InitMocksResult {
  const MockResolveFrom = sandbox.stub().callsFake((cwd: string, id: string) =>
    path.join(cwd, id)
  ) as MockResolveFrom;

  const MockPkgDir = sandbox.stub().resolvesArg(0) as MockPkgDir;

  const MockReadPkg: MockReadPkg = {
    readPackage: sandbox.stub().callsFake(async () => MockReadPkg.__pkg),
    __pkg: {
      name: 'mock-package',
      version: '1.0.0',
      readme: '# Mock Package!!',
      _id: 'mock-package',
    },
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
    'resolve-from': MockResolveFrom,
    'read-pkg': MockReadPkg,
    'package-directory': MockPkgDir,
    teen_process: MockTeenProcess,
    fs: MockFs,
  };

  return {
    MockResolveFrom,
    MockPkgDir,
    MockReadPkg,
    MockFs,
    MockTeenProcess,
    sandbox,
    overrides,
  };
}

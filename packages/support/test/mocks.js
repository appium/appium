/* eslint-disable require-await */
// @ts-check

/**
 * A collection of mocks reused across unit tests.
 */

import path from 'path';
import { createSandbox } from 'sinon';

export function initMocks (sandbox = createSandbox()) {
  const MockResolveFrom = /** @type {MockResolveFrom} */ (
    sandbox.stub().callsFake((cwd, id) => path.join(cwd, id))
  );

  const MockPkgDir = /** @type {MockPkgDir} */(sandbox.stub().resolvesArg(0));

  const MockReadPkg = /** @type {MockReadPkg} */ (
    sandbox.stub().callsFake(async () => MockReadPkg.__pkg)
  );

  // just an accessible place to put a mock package.json if we need it
  MockReadPkg.__pkg = {
    name: 'mock-package',
    version: '1.0.0',
    readme: '# Mock Package!!',
    _id: 'mock-package',
  };

  const MockFs = /** @type {MockFs} */ ({
    access: sandbox.stub().resolves(true),
  });

  const MockTeenProcess = /** @type {MockTeenProcess} */({
    exec: sandbox.stub().callsFake(async () => ({
      stdout: MockTeenProcess.__stdout,
      stderr: MockTeenProcess.__stderr,
      code: MockTeenProcess.__code,
    })),
  });
  MockTeenProcess.__stdout = '';
  MockTeenProcess.__stderr = '';
  MockTeenProcess.__code = 0;

  /** @type {Overrides} */
  const overrides = {
    'resolve-from': MockResolveFrom,
    'read-pkg': MockReadPkg,
    'pkg-dir': MockPkgDir,
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

/**
 * Mocks for `resolve-from` package
 * @typedef {sinon.SinonStubbedMember<import('resolve-from')>} MockResolveFrom
 */

/**
 * Mocks for `pkg-dir` package
 * @typedef {sinon.SinonStubbedMember<import('pkg-dir')>} MockPkgDir
 */

/**
 * Mocks for `fs` built-in
 * @typedef { {access: sinon.SinonStubbedMember<import('fs').access>} } MockFs
 */

/**
 * For passing into `rewiremock.proxy()`.
 * @typedef { {'resolve-from': MockResolveFrom, 'pkg-dir': MockPkgDir, 'read-pkg': MockReadPkg, 'teen_process': MockTeenProcess, fs: MockFs} } Overrides
 */

/**
 * @typedef {sinon.SinonStubbedMember<import('read-pkg')> & {__pkg: import('read-pkg').NormalizedPackageJson}} MockReadPkg
 */

/**
 * @typedef { { exec: sinon.SinonStub<[string, string[], import('../lib/npm').TeenProcessExecOpts], import('../lib/npm').TeenProcessExecResult>, __stdout: string, __stderr: string, __code: number} } MockTeenProcess
 */

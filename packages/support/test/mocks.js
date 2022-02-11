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

  const MockReadPkgUp = /** @type {MockReadPkgUp} */ (
    sandbox.stub().callsFake(
      async ({cwd = process.cwd()}) =>
        await {
          packageJson: MockReadPkgUp.__pkg,
          path: path.join(cwd, 'package.json'),
        },
    )
  );

  // just an accessible place to put a mock package.json if we need it
  MockReadPkgUp.__pkg = {
    name: 'mock-package',
    version: '1.0.0',
    readme: '# Mock Package!!',
    _id: 'mock-package',
  };

  const MockFs = /** @type {MockFs} */ ({
    access: sandbox.stub().resolves(true),
  });

  /** @type {Overrides} */
  const overrides = {
    'resolve-from': MockResolveFrom,
    'read-pkg-up': MockReadPkgUp,
    fs: MockFs,
  };

  return {
    MockResolveFrom,
    MockReadPkgUp,
    MockFs,
    sandbox,
    overrides
  };
}

/**
 * Mocks for `resolve-from` package
 * @typedef {sinon.SinonStubbedMember<import('resolve-from')>} MockResolveFrom
 */

/**
 * Mocks for `read-pkg-up` package
 * @typedef {sinon.SinonStubbedMember<import('read-pkg-up')> & {__pkg: import('read-pkg-up').NormalizedPackageJson}} MockReadPkgUp
 */

/**
 * Mocks for `fs` built-in
 * @typedef { {access: sinon.SinonStubbedMember<import('fs').access>} } MockFs
 */

/**
 * For passing into `rewiremock.proxy()`.
 * @typedef { {'resolve-from': MockResolveFrom, 'read-pkg-up': MockReadPkgUp, fs: MockFs} } Overrides
 */

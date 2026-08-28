import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, beforeEach, before, after, mock} from 'node:test';

import * as support from '@appium/support';

import {PKG_HASHFILE_RELATIVE_PATH} from '../../../lib/constants.js';
import * as isPackageChangedModule from '../../../lib/utils/is-package-changed.js';
import {initMocks, resetMockDefaults} from './mocks.js';
import type {InitMocksResult, MockAppiumSupport, MockPackageChanged} from './mocks.js';

type PackageDidChangeFn = (appiumHome?: string) => Promise<boolean>;

describe('package-changed', function () {
  let packageDidChange: PackageDidChangeFn;
  let mocks: InitMocksResult;
  let MockPackageChanged: MockPackageChanged;
  let MockAppiumSupport: MockAppiumSupport;
  let importCounter = 0;

  // `package-changed.ts` imports `is-package-changed.js` and `@appium/support` *directly*
  // (not through the `utils/index.js` barrel), so mocking those two leaf specifiers is enough
  // here — unlike `applyExtensionMocks` in mocks.ts, which mocks the barrel. See that
  // function's doc comment for why `packageDidChange` is dynamically re-imported fresh per
  // test rather than as a static top-level import.
  before(function () {
    mocks = initMocks();
    MockPackageChanged = mocks.MockPackageChanged;
    MockAppiumSupport = mocks.MockAppiumSupport;
    mock.module('@appium/support', {
      namedExports: {...support, ...MockAppiumSupport},
    });
    mock.module('../../../lib/utils/is-package-changed.js', {
      namedExports: {...isPackageChangedModule, isPackageChanged: MockPackageChanged.isPackageChanged},
    });
  });

  after(function () {
    mock.reset();
  });

  beforeEach(async function () {
    resetMockDefaults(mocks);
    ({packageDidChange} = await import(`../../../lib/utils/package-changed.js?t=${importCounter++}`));
  });

  describe('packageDidChange()', function () {
    describe('when called without an `appiumHome`', function () {
      it('should reject', async function () {
        // from passing `undefined` to `path.join()`
        await assert.rejects(packageDidChange(), TypeError);
      });
    });

    it('it should attempt to create the parent dir for the hash file', async function () {
      await packageDidChange('/some/path');
      assert.strictEqual(
        MockAppiumSupport.fs.mkdirp.calledWith(path.dirname(path.join('/some/path', PKG_HASHFILE_RELATIVE_PATH))),
        true,
      );
    });

    it('should call `isPackageChanged` with a cwd and relative path to hash file', async function () {
      await packageDidChange('/some/path');
      assert.strictEqual(
        MockPackageChanged.isPackageChanged.calledWith({
          cwd: '/some/path',
          hashFilename: PKG_HASHFILE_RELATIVE_PATH,
        }),
        true,
      );
    });

    describe('when it cannot create the parent dir', function () {
      it('should reject', async function () {
        MockAppiumSupport.fs.mkdirp.rejects(new Error('some error'));
        await assert.rejects(packageDidChange('/some/path'), {
          name: 'Error',
          message: /could not create the directory/i,
        });
      });
    });

    describe('when the package has not changed per `isPackageChanged`', function () {
      beforeEach(function () {
        MockPackageChanged.isPackageChanged.resolves({
          isChanged: false,
          writeHash: MockPackageChanged.__writeHash,
          hash: 'some-hash',
          oldHash: 'some-old-hash',
        });
      });

      it('should resolve `false`', async function () {
        assert.strictEqual(await packageDidChange('/disneyland'), false);
      });

      it('should not write the hash file', async function () {
        await packageDidChange('/some/where');
        assert.strictEqual(MockPackageChanged.__writeHash.called, false);
      });
    });

    describe('when the package has changed per `isPackageChanged`', function () {
      it('should write the hash file', async function () {
        await packageDidChange('/some/where');
        assert.strictEqual(MockPackageChanged.__writeHash.calledOnce, true);
      });

      it('should resolve `true`', async function () {
        assert.strictEqual(await packageDidChange('/somewhere/else'), true);
      });

      describe('when it cannot write the hash file', function () {
        beforeEach(function () {
          MockPackageChanged.__writeHash.throws(new Error('oh noes'));
        });
        it('should reject', async function () {
          await assert.rejects(packageDidChange('/some/where'), {name: 'Error', message: /could not write hash file/i});
        });
      });
    });
  });
});

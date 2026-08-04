import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, beforeEach, afterEach} from 'node:test';

import type {SinonSandbox} from 'sinon';

import {PKG_HASHFILE_RELATIVE_PATH} from '../../../lib/constants';
import {rewiremock} from '../../helpers';
import {initMocks} from './mocks';
import type {MockAppiumSupport, MockPackageChanged} from './mocks';

type PackageDidChangeFn = (appiumHome?: string) => Promise<boolean>;

describe('package-changed', function () {
  let packageDidChange: PackageDidChangeFn;
  let sandbox: SinonSandbox;
  let MockPackageChanged: MockPackageChanged;
  let MockAppiumSupport: MockAppiumSupport;

  beforeEach(function () {
    ({MockPackageChanged, MockAppiumSupport, sandbox} = initMocks());
    ({packageDidChange} = rewiremock.proxy(() => require('../../../lib/utils/package-changed'), {
      '../../../lib/utils/is-package-changed': MockPackageChanged,
      '@appium/support': MockAppiumSupport,
    }));
  });

  afterEach(function () {
    sandbox.restore();
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
        await assert.rejects(
          packageDidChange('/some/path'),
          (err: unknown) => err instanceof Error && /could not create the directory/i.test(err.message),
        );
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
          await assert.rejects(
            packageDidChange('/some/where'),
            (err: unknown) => err instanceof Error && /could not write hash file/i.test(err.message),
          );
        });
      });
    });
  });
});

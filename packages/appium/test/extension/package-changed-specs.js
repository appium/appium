// @ts-check
import path from 'path';
import { HASHFILE_RELATIVE_PATH } from '../../lib/constants';
import { rewiremock } from '../helpers';
import { initMocks } from './mocks';

const {expect} = chai;

describe('package-changed', function () {
  /** @type {typeof import('../../lib/extension/package-changed').packageDidChange} */
  let packageDidChange;

  /** @type {sinon.SinonSandbox} */
  let sandbox;

  /** @type {import('./mocks').PackageChangedMocks} */
  let PackageChangedMocks;

  /** @type {import('./mocks').AppiumSupportMocks} */
  let AppiumSupportMocks;

  beforeEach(function () {
    ({PackageChangedMocks, AppiumSupportMocks, sandbox} = initMocks());
    ({packageDidChange} = rewiremock.proxy(
      () => require('../../lib/extension/package-changed'),
      {
        'package-changed': PackageChangedMocks,
        '@appium/support': AppiumSupportMocks,
      },
    ));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('packageDidChange()', function () {
    describe('when called without an `appiumHome`', function () {
      it('should reject', async function () {
        // @ts-expect-error
        await expect(packageDidChange()).to.be.rejectedWith(
          TypeError // from passing `undefined` to `path.join()`
        );
      });
    });

    it('it should attempt to create the parent dir for the hash file', async function () {
      await packageDidChange('/some/path');
      expect(AppiumSupportMocks.mkdirp).to.have.been.calledWith(
        path.dirname(path.join('/some/path', HASHFILE_RELATIVE_PATH)),
      );
    });

    it('should call `package-changed` with a cwd and relative path to hash file', async function () {
      await packageDidChange('/some/path');
      expect(PackageChangedMocks.isPackageChanged).to.have.been.calledWith({
        cwd: '/some/path',
        hashFilename: HASHFILE_RELATIVE_PATH,
      });
    });

    describe('when it cannot create the parent dir', function () {
      it('should reject', async function () {
        AppiumSupportMocks.mkdirp.rejects(new Error('some error'));
        await expect(packageDidChange('/some/path')).to.be.rejectedWith(
          Error,
          /could not create the directory/i,
        );
      });
    });

    describe('when the package has not changed per `package-changed`', function () {
      beforeEach(function () {
        PackageChangedMocks.isPackageChanged.resolves({
          isChanged: false,
          writeHash: PackageChangedMocks.__writeHash,
          hash: 'some-hash',
          oldHash: 'some-old-hash',
        });
      });

      it('should resolve `false`', async function () {
        expect(await packageDidChange('/disneyland')).to.be.false;
      });

      it('should not write the hash file', async function () {
        await packageDidChange('/some/where');
        expect(PackageChangedMocks.__writeHash).not.to.have.been.called;
      });
    });

    describe('when the package has changed per `package-changed`', function () {
      it('should write the hash file', async function () {
        await packageDidChange('/some/where');
        expect(PackageChangedMocks.__writeHash).to.have.been.calledOnce;
      });

      it('should resolve `true`', async function () {
        expect(await packageDidChange('/somewhere/else')).to.be.true;
      });

      describe('when it cannot write the hash file', function () {
        beforeEach(function () {
          PackageChangedMocks.__writeHash.throws(new Error('oh noes'));
        });
        it('should reject', async function () {
          await expect(packageDidChange('/some/where')).to.be.rejectedWith(
            Error,
            /could not write hash file/i,
          );
        });
      });
    });
  });
});

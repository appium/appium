import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import path from 'node:path';
import type {SinonSandbox} from 'sinon';
import {PKG_HASHFILE_RELATIVE_PATH} from '../../../lib/constants';
import {rewiremock} from '../../helpers';
import {initMocks} from './mocks';
import type {MockAppiumSupport, MockPackageChanged} from './mocks';

type PackageDidChangeFn = (appiumHome?: string) => Promise<boolean>;

const {expect} = chai;
chai.use(chaiAsPromised);

describe('package-changed', function () {
  let packageDidChange: PackageDidChangeFn;
  let sandbox: SinonSandbox;
  let MockPackageChanged: MockPackageChanged;
  let MockAppiumSupport: MockAppiumSupport;

  beforeEach(function () {
    ({MockPackageChanged, MockAppiumSupport, sandbox} = initMocks());
    ({packageDidChange} = rewiremock.proxy(
      () => require('../../../lib/extension/package-changed'),
      {
        'package-changed': MockPackageChanged,
        '@appium/support': MockAppiumSupport,
      }
    ));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('packageDidChange()', function () {
    describe('when called without an `appiumHome`', function () {
      it('should reject', async function () {
        await expect(packageDidChange()).to.be.rejectedWith(
          TypeError // from passing `undefined` to `path.join()`
        );
      });
    });

    it('it should attempt to create the parent dir for the hash file', async function () {
      await packageDidChange('/some/path');
      expect(
        MockAppiumSupport.fs.mkdirp.calledWith(
          path.dirname(path.join('/some/path', PKG_HASHFILE_RELATIVE_PATH))
        )
      ).to.be.true;
    });

    it('should call `package-changed` with a cwd and relative path to hash file', async function () {
      await packageDidChange('/some/path');
      expect(
        MockPackageChanged.isPackageChanged.calledWith({
          cwd: '/some/path',
          hashFilename: PKG_HASHFILE_RELATIVE_PATH,
        })
      ).to.be.true;
    });

    describe('when it cannot create the parent dir', function () {
      it('should reject', async function () {
        MockAppiumSupport.fs.mkdirp.rejects(new Error('some error'));
        await expect(packageDidChange('/some/path')).to.be.rejectedWith(
          Error,
          /could not create the directory/i
        );
      });
    });

    describe('when the package has not changed per `package-changed`', function () {
      beforeEach(function () {
        MockPackageChanged.isPackageChanged.resolves({
          isChanged: false,
          writeHash: MockPackageChanged.__writeHash,
          hash: 'some-hash',
          oldHash: 'some-old-hash',
        });
      });

      it('should resolve `false`', async function () {
        expect(await packageDidChange('/disneyland')).to.be.false;
      });

      it('should not write the hash file', async function () {
        await packageDidChange('/some/where');
        expect(MockPackageChanged.__writeHash.called).to.be.false;
      });
    });

    describe('when the package has changed per `package-changed`', function () {
      it('should write the hash file', async function () {
        await packageDidChange('/some/where');
        expect(MockPackageChanged.__writeHash.calledOnce).to.be.true;
      });

      it('should resolve `true`', async function () {
        expect(await packageDidChange('/somewhere/else')).to.be.true;
      });

      describe('when it cannot write the hash file', function () {
        beforeEach(function () {
          MockPackageChanged.__writeHash.throws(new Error('oh noes'));
        });
        it('should reject', async function () {
          await expect(packageDidChange('/some/where')).to.be.rejectedWith(
            Error,
            /could not write hash file/i
          );
        });
      });
    });
  });
});

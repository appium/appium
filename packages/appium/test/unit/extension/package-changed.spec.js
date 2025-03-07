// @ts-check
import path from 'path';
import {PKG_HASHFILE_RELATIVE_PATH} from '../../../lib/constants';
import {rewiremock} from '../../helpers.cjs';
import {initMocks} from './mocks.cjs';

describe('package-changed', function () {
  /** @type {typeof import('appium/lib/extension/package-changed').packageDidChange} */
  let packageDidChange;

  /** @type {sinon.SinonSandbox} */
  let sandbox;

  /** @type {import('./mocks.cjs').MockPackageChanged} */
  let MockPackageChanged;

  /** @type {import('./mocks.cjs').MockAppiumSupport} */
  let MockAppiumSupport;

  let expect;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    expect = chai.expect;
  });

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
        // @ts-expect-error
        await expect(packageDidChange()).to.be.rejectedWith(
          TypeError // from passing `undefined` to `path.join()`
        );
      });
    });

    it('it should attempt to create the parent dir for the hash file', async function () {
      await packageDidChange('/some/path');
      MockAppiumSupport.fs.mkdirp.calledWith(
        path.dirname(path.join('/some/path', PKG_HASHFILE_RELATIVE_PATH))
      ).should.be.true;
    });

    it('should call `package-changed` with a cwd and relative path to hash file', async function () {
      await packageDidChange('/some/path');
      MockPackageChanged.isPackageChanged.calledWith({
        cwd: '/some/path',
        hashFilename: PKG_HASHFILE_RELATIVE_PATH,
      }).should.be.true;
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
        MockPackageChanged.__writeHash.called.should.be.false;
      });
    });

    describe('when the package has changed per `package-changed`', function () {
      it('should write the hash file', async function () {
        await packageDidChange('/some/where');
        MockPackageChanged.__writeHash.calledOnce.should.be.true;
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

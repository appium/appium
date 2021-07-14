import { zip, fs, tempDir } from 'appium-support';
import { configureApp, isPackageOrBundle, duplicateKeys, parseCapsArray } from '../../lib/basedriver/helpers';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

chai.use(chaiAsPromised);
const should = chai.should();

describe('helpers', function () {
  describe('#isPackageOrBundle', function () {
    it('should accept packages and bundles', function () {
      isPackageOrBundle('io.appium.testapp').should.be.true;
    });
    it('should not accept non-packages or non-bundles', function () {
      isPackageOrBundle('foo').should.be.false;
      isPackageOrBundle('/path/to/an.app').should.be.false;
      isPackageOrBundle('/path/to/an.apk').should.be.false;
    });
  });

  describe('#duplicateKeys', function () {
    it('should translate key in an object', function () {
      duplicateKeys({'foo': 'hello world'}, 'foo', 'bar').should.eql({'foo': 'hello world', 'bar': 'hello world'});
    });
    it('should translate key in an object within an object', function () {
      duplicateKeys({'key': {'foo': 'hello world'}}, 'foo', 'bar').should.eql({'key': {'foo': 'hello world', 'bar': 'hello world'}});
    });
    it('should translate key in an object with an array', function () {
      duplicateKeys([
        {'key': {'foo': 'hello world'}},
        {'foo': 'HELLO WORLD'}
      ], 'foo', 'bar').should.eql([
        {'key': {'foo': 'hello world', 'bar': 'hello world'}},
        {'foo': 'HELLO WORLD', 'bar': 'HELLO WORLD'}
      ]);
    });
    it('should duplicate both keys', function () {
      duplicateKeys({
        'keyOne': {
          'foo': 'hello world',
        },
        'keyTwo': {
          'bar': 'HELLO WORLD',
        },
      }, 'foo', 'bar').should.eql({
        'keyOne': {
          'foo': 'hello world',
          'bar': 'hello world',
        },
        'keyTwo': {
          'bar': 'HELLO WORLD',
          'foo': 'HELLO WORLD',
        }
      });
    });
    it('should not do anything to primitives', function () {
      [0, 1, -1, true, false, null, undefined, '', 'Hello World'].forEach((item) => {
        should.equal(duplicateKeys(item), item);
      });
    });
    it('should rename keys on big complex objects', function () {
      const input = [
        {'foo': 'bar'},
        {
          hello: {
            world: {
              'foo': 'BAR',
            }
          },
          foo: 'bahr'
        },
        'foo',
        null,
        0
      ];
      const expectedOutput = [
        {'foo': 'bar', 'FOO': 'bar'},
        {
          hello: {
            world: {
              'foo': 'BAR',
              'FOO': 'BAR',
            }
          },
          foo: 'bahr',
          FOO: 'bahr'
        },
        'foo',
        null,
        0
      ];
      duplicateKeys(input, 'foo', 'FOO').should.deep.equal(expectedOutput);
    });
  });

  describe('#configureApp', function () {
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(zip, 'extractAllTo').resolves();
      sandbox.stub(zip, 'assertValidZip').resolves();
      sandbox.stub(fs, 'mv').resolves();
      sandbox.stub(fs, 'exists').resolves(true);
      sandbox.stub(fs, 'hash').resolves('0xDEADBEEF');
      sandbox.stub(fs, 'glob').resolves(['/path/to/an.apk']);
      sandbox.stub(fs, 'rimraf').resolves();
      sandbox.stub(tempDir, 'openDir').resolves('/some/dir');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should pass "useSystemUnzip" flag through to appium-support', async function () {
      await configureApp('/path/to/an.apk.zip', '.apk');
      zip.extractAllTo.getCall(0).lastArg.useSystemUnzip.should.be.true;
    });
  });
});

describe('parseCapsArray', function () {
  it('should parse string into array', function () {
    parseCapsArray('/tmp/my/app.zip').should.eql(['/tmp/my/app.zip']);
  });
  it('should parse array as string into array', function () {
    parseCapsArray('["/tmp/my/app.zip"]').should.eql(['/tmp/my/app.zip']);
    parseCapsArray('["/tmp/my/app.zip","/tmp/my/app2.zip"]').should.eql([
      '/tmp/my/app.zip',
      '/tmp/my/app2.zip'
    ]);
  });
  it('should return an array without change', function () {
    parseCapsArray(['a', 'b']).should.eql(['a', 'b']);
  });
});

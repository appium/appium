import { isPackageOrBundle, unzipFile, renameKey } from '../../lib/basedriver/helpers';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import path from 'path';
import sinon from 'sinon';
import { system, fs } from 'appium-support';
import mockFS from 'mock-fs';

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

  describe('#unzipFile', function () {
    let mockDir = 'path/to/mock/dir';
    before(async function () {
      // Start mock filesystem
      mockFS({
        [mockDir]: {},
      });

      // Write the base64 contents of FakeIOSApp.app.zip to the mock filesystem

      const fakeIOSAppZip = 'UEsDBBQACAAIABF8/EYAAAAAAAAAAAAAAAAOABAARmFrZUlPU0FwcC5hcHBVWAwALwO4VQIDuFX1ARQAK8nILFYAorz8EoWi1MScnEqFxDyFxIICLgBQSwcIR93jPhoAAAAaAAAAUEsBAhUDFAAIAAgAEXz8Rkfd4z4aAAAAGgAAAA4ADAAAAAAAAAAAQKSBAAAAAEZha2VJT1NBcHAuYXBwVVgIAC8DuFUCA7hVUEsFBgAAAAABAAEASAAAAGYAAAAAAA==';
      await fs.writeFile(path.resolve(mockDir, 'FakeIOSApp.app.zip'), fakeIOSAppZip, 'base64');
    });

    after(function () {
      mockFS.restore();
    });

    it('should unzip a .zip file (force isWindows to be true so we can test the internal zip library)', async function () {
      const forceWindows = sinon.stub(system, 'isWindows', () => true);
      await unzipFile(path.resolve(mockDir, 'FakeIOSApp.app.zip'));
      await fs.readFile(path.resolve(mockDir, 'FakeIOSApp.app'), 'utf8').should.eventually.deep.equal('this is not really an app\n');
      forceWindows.restore();
    });
  });

  describe('#renameKey', function () {
    it('should translate key in an object', function () {
      renameKey({'foo': 'hello world'}, 'foo', 'bar').should.eql({'bar': 'hello world'});
    });
    it('should translate key in an object within an object', function () {
      renameKey({'key': {'foo': 'hello world'}}, 'foo', 'bar').should.eql({'key': {'bar': 'hello world'}});
    });
    it('should translate key in an object with an array', function () {
      renameKey([
        {'key': {'foo': 'hello world'}},
        {'foo': 'HELLO WORLD'}
      ], 'foo', 'bar').should.eql([
        {'key': {'bar': 'hello world'}},
        {'bar': 'HELLO WORLD'}
      ]);
    });
    it('should not do anything to primitives', function () {
      [0, 1, -1, true, false, null, undefined, "", "Hello World"].forEach((item) => {
        should.equal(renameKey(item), item);
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
        {'FOO': 'bar'},
        {
          hello: {
            world: {
              'FOO': 'BAR',
            }
          },
          FOO: 'bahr'
        },
        'foo',
        null,
        0
      ];
      renameKey(input, 'foo', 'FOO').should.deep.equal(expectedOutput);
    });
  });
});

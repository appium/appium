import { isPackageOrBundle, unzipFile } from '../../lib/basedriver/helpers';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import path from 'path';
import sinon from 'sinon';
import { system, fs } from 'appium-support';
import mockFS from 'mock-fs';

chai.use(chaiAsPromised);

describe('helpers', () => {
  describe('#isPackageOrBundle', () => {
    it('should accept packages and bundles', () => {
      isPackageOrBundle('io.appium.testapp').should.be.true;
    });
    it('should not accept non-packages or non-bundles', () => {
      isPackageOrBundle('foo').should.be.false;
      isPackageOrBundle('/path/to/an.app').should.be.false;
      isPackageOrBundle('/path/to/an.apk').should.be.false;
    });
  });

  describe('#unzipFile', () => {
    let mockDir = 'path/to/mock/dir';
    before(async () => {
      // Start mock filesystem
      mockFS({
        [mockDir]: {},
      });

      // Write the base64 contents of FakeIOSApp.app.zip to the mock filesystem

      const fakeIOSAppZip = 'UEsDBBQACAAIABF8/EYAAAAAAAAAAAAAAAAOABAARmFrZUlPU0FwcC5hcHBVWAwALwO4VQIDuFX1ARQAK8nILFYAorz8EoWi1MScnEqFxDyFxIICLgBQSwcIR93jPhoAAAAaAAAAUEsBAhUDFAAIAAgAEXz8Rkfd4z4aAAAAGgAAAA4ADAAAAAAAAAAAQKSBAAAAAEZha2VJT1NBcHAuYXBwVVgIAC8DuFUCA7hVUEsFBgAAAAABAAEASAAAAGYAAAAAAA==';
      await fs.writeFile(path.resolve(mockDir, 'FakeIOSApp.app.zip'), fakeIOSAppZip, 'base64');
    });

    after(() => {
      mockFS.restore();
    });

    it('should unzip a .zip file (force isWindows to be true so we can test the internal zip library)', async () => {
      const forceWindows = sinon.stub(system, 'isWindows', () => true);
      await unzipFile(path.resolve(mockDir, 'FakeIOSApp.app.zip'));
      await fs.readFile(path.resolve(mockDir, 'FakeIOSApp.app'), 'utf8').should.eventually.deep.equal('this is not really an app\n');
      forceWindows.restore();
    });
  });
});

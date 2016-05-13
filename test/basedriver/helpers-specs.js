import { isPackageOrBundle } from '../../lib/basedriver/helpers';
import chai from 'chai';
chai.should();

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
});

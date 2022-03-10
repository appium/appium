
import AppiumSupport from '../../lib/index.js';

let { system, tempDir, util } = AppiumSupport;

describe('index', function () {
  describe('default', function () {
    it('should expose an object', function () {
      AppiumSupport.should.exist;
      AppiumSupport.should.be.an.instanceof(Object);
    });
    it('should expose system object', function () {
      AppiumSupport.system.should.exist;
      AppiumSupport.system.should.be.an.instanceof(Object);
    });
    it('should expose tempDir object', function () {
      AppiumSupport.tempDir.should.exist;
      AppiumSupport.tempDir.should.be.an.instanceof(Object);
    });
    it('should expose util object', function () {
      AppiumSupport.util.should.exist;
      AppiumSupport.util.should.be.an.instanceof(Object);
    });
  });

  it('should expose an object as "system" ', function () {
    system.should.be.an.instanceof(Object);
  });

  it('should expose an object as "tempDir" ', function () {
    tempDir.should.be.an.instanceof(Object);
  });

  it('should expose an object as "util" ', function () {
    util.should.be.an.instanceof(Object);
  });
});

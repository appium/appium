import {expect} from 'chai';
import * as chai from 'chai';
import AppiumSupport from '../../lib/';

const {system, tempDir, util} = AppiumSupport;

describe('index', function () {
  before(function () {
    chai.should();
  });

  describe('default', function () {
    it('should expose an object', function () {
      expect(AppiumSupport).to.exist;
      expect(AppiumSupport).to.be.an.instanceof(Object);
    });
    it('should expose system object', function () {
      expect(AppiumSupport.system).to.exist;
      expect(AppiumSupport.system).to.be.an.instanceof(Object);
    });
    it('should expose tempDir object', function () {
      expect(AppiumSupport.tempDir).to.exist;
      expect(AppiumSupport.tempDir).to.be.an.instanceof(Object);
    });
    it('should expose util object', function () {
      expect(AppiumSupport.util).to.exist;
      expect(AppiumSupport.util).to.be.an.instanceof(Object);
    });
  });

  it('should expose an object as "system" ', function () {
    expect(system).to.be.an.instanceof(Object);
  });

  it('should expose an object as "tempDir" ', function () {
    expect(tempDir).to.be.an.instanceof(Object);
  });

  it('should expose an object as "util" ', function () {
    expect(util).to.be.an.instanceof(Object);
  });
});

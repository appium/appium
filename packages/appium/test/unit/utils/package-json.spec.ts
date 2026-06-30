import chai from 'chai';
import { npmPackage } from '../../../lib/utils/package-json';

const { expect } = chai;

describe('utils/package-json', function () {
  describe('npmPackage', function () {
    it('should expose package metadata', function () {
      expect(npmPackage).to.have.property('name', 'appium');
    });
  });
});

// transpile:mocha

import {NPM} from '../../lib/npm';

describe('npm', function () {
  let should;

  before(async function () {
    const chai = await import('chai');
    should = chai.should();
  });

  describe('getLatestSafeUpgradeFromVersions()', function () {
    const versions1 = [
      '0.1.0',
      '0.1.1',
      '0.2.0',
      '0.2.5',
      '1.0.0',
      '1.0.1',
      '1.1.5',
      '1.2.7',
      '2.0.0',
      '1.2.8-beta',
      '1.2.9-alpha',
      '1.3.0-rc',
      '2.0.1-beta',
    ];
    const npm = new NPM();
    it('should get the latest minor upgrade in a list of versions', function () {
      npm.getLatestSafeUpgradeFromVersions('0.1.0', versions1).should.eql('0.2.5');
      npm.getLatestSafeUpgradeFromVersions('1.0.0', versions1).should.eql('1.2.7');
      npm.getLatestSafeUpgradeFromVersions('0.2.0', versions1).should.eql('0.2.5');
    });
    it('should throw if the current version cannot be parsed', function () {
      should.throw(() => {
        npm.getLatestSafeUpgradeFromVersions('', versions1);
      });
    });
    it('should ignore an error if one of versions cannot be parsed', function () {
      npm.getLatestSafeUpgradeFromVersions('0.1.0', ['', '0.2.0']).should.eql('0.2.0');
    });
    it('should return null if no newer version is found', function () {
      (null === npm.getLatestSafeUpgradeFromVersions('10', versions1)).should.be.true;
    });
  });
});

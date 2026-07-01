import {expect} from 'chai';

import {adler32} from '../../../lib/utils/hash';

describe('utils/hash', function () {
  describe('adler32()', function () {
    it('should compute checksum for known inputs', function () {
      expect(adler32('')).to.equal(1);
      expect(adler32('hello')).to.equal(103547413);
      expect(adler32('😀')).to.equal(122749608);
    });

    it('should support checksum seeding', function () {
      const seed = adler32('hello');
      expect(adler32(' world', seed)).to.equal(adler32('hello world'));
    });
  });
});

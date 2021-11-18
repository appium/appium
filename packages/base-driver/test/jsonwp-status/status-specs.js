import _ from 'lodash';
import { statusCodes, getSummaryByCode } from '../../lib';



describe('jsonwp-status', function () {
  describe('codes', function () {
    it('should export code numbers and summaries', function () {
      for (let obj of _.values(statusCodes)) {
        should.exist(obj.code);
        obj.code.should.be.a('number');
        should.exist(obj.summary);
        obj.summary.should.be.a('string');
      }
    });
  });
  describe('getSummaryByCode', function () {
    it('should get the summary for a code', function () {
      getSummaryByCode(0).should.equal('The command executed successfully.');
    });
    it('should convert codes to ints', function () {
      getSummaryByCode('0').should.equal('The command executed successfully.');
    });
    it('should return an error string for unknown code', function () {
      getSummaryByCode(1000).should.equal('An error occurred');
    });
  });
});

import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import _ from 'lodash';
import {statusCodes, getSummaryByCode} from '../../../lib';

chai.use(chaiAsPromised);

describe('jsonwp-status', function () {
  describe('codes', function () {
    it('should export code numbers and summaries', function () {
      for (const obj of _.values(statusCodes)) {
        expect(obj).to.have.property('code');
        expect(obj.code).to.be.a('number');
        expect(obj).to.have.property('summary');
        expect(obj.summary).to.be.a('string');
      }
    });
  });
  describe('getSummaryByCode', function () {
    it('should get the summary for a code', function () {
      expect(getSummaryByCode(0)).to.equal('The command executed successfully.');
    });
    it('should convert codes to ints', function () {
      expect(getSummaryByCode('0')).to.equal('The command executed successfully.');
    });
    it('should return an error string for unknown code', function () {
      expect(getSummaryByCode(1000)).to.equal('An error occurred');
    });
  });
});

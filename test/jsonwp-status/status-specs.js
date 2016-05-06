// transpile:mocha
/* global describe:true, it:true */

import _ from 'lodash';
import { statusCodes, getSummaryByCode } from '../..';
import chai from 'chai';


const should = chai.should();

describe('jsonwp-status', () => {
  describe('codes', () => {
    it('should export code numbers and summaries', () => {
      for (let obj of _.values(statusCodes)) {
        should.exist(obj.code);
        obj.code.should.be.a('number');
        should.exist(obj.summary);
        obj.summary.should.be.a('string');
      }
    });
  });
  describe('getSummaryByCode', () => {
    it('should get the summary for a code', () => {
      getSummaryByCode(0).should.equal('The command executed successfully.');
    });
    it('should convert codes to ints', () => {
      getSummaryByCode('0').should.equal('The command executed successfully.');
    });
    it('should return an error string for unknown code', () => {
      getSummaryByCode(1000).should.equal('An error occurred');
    });
  });
});

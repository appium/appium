// transpile:mocha
/* global describe:true, it:true */

import _ from 'lodash';
import ProtocolConverter from '../../lib/jsonwp-proxy/protocol-converter';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import BaseDriver from '../../lib/basedriver/driver';

const {MJSONWP, W3C} = BaseDriver.DRIVER_PROTOCOL;

chai.use(chaiAsPromised);

describe('Protocol Converter', function () {
  describe('getTimeoutRequestObjects', function () {
    let converter;
    before(function () {
      converter = new ProtocolConverter(_.noop);
    });
    it('should take W3C inputs and produce MJSONWP compatible objects', function () {
      converter.downstreamProtocol = MJSONWP;
      let timeoutObjects = converter.getTimeoutRequestObjects({script: 100});
      timeoutObjects.length.should.equal(1);
      timeoutObjects[0].should.eql({type: 'script', ms: 100});
    });
    it('should take multiple W3C timeouts and produce multiple MJSONWP compatible objects', function () {
      converter.downstreamProtocol = MJSONWP;
      let [scriptTimeout, pageLoadTimeout, implicitTimeout] = converter.getTimeoutRequestObjects({script: 100, pageLoad: 200, implicit: 300});
      scriptTimeout.should.eql({
        type: 'script',
        ms: 100,
      });
      pageLoadTimeout.should.eql({
        type: 'page load',
        ms: 200,
      });
      implicitTimeout.should.eql({
        type: 'implicit',
        ms: 300,
      });
    });
    it('should take MJSONWP input and produce W3C compatible object', function () {
      converter.downstreamProtocol = W3C;
      let timeoutObjects = converter.getTimeoutRequestObjects({type: 'implicit', ms: 300});
      timeoutObjects.length.should.equal(1);
      timeoutObjects[0].should.eql({implicit: 300});
    });
    it('should not change the input if protocol name is unknown', function () {
      converter.downstreamProtocol = null;
      let timeoutObjects = converter.getTimeoutRequestObjects({type: 'implicit', ms: 300});
      timeoutObjects.length.should.equal(1);
      timeoutObjects[0].should.eql({type: 'implicit', ms: 300});
    });
    it('should not change the input if protocol name is unchanged', function () {
      converter.downstreamProtocol = MJSONWP;
      let timeoutObjects = converter.getTimeoutRequestObjects({type: 'implicit', ms: 300});
      timeoutObjects.length.should.equal(1);
      timeoutObjects[0].should.eql({type: 'implicit', ms: 300});
    });
  });
});

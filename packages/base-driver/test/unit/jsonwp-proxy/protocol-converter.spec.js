import _ from 'lodash';
import { PROTOCOLS } from '../../../lib/constants';
import ProtocolConverter, {COMMAND_URLS_CONFLICTS} from '../../../lib/jsonwp-proxy/protocol-converter';

const {MJSONWP, W3C} = PROTOCOLS;


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
    it('should ignore invalid entries while converting from W3C', function () {
      converter.downstreamProtocol = MJSONWP;
      let timeoutObjects = converter.getTimeoutRequestObjects({
        script: 100,
        sessionId: '5432a4f3-cd89-4781-8905-ea9d3150840c',
        bar: -1,
        baz: undefined,
      });
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

  describe('setValue', function () {
    let converter;
    let responseBody;
    before(function () {
      responseBody = null;
      converter = new ProtocolConverter((url, method, body) => {
        responseBody = body;
      });
    });
    beforeEach(function () {
      responseBody = {};
    });

    it('should calculate value if not present', async function () {
      await converter.proxySetValue('', '', {
        text: 'bla',
      });
      responseBody.should.eql({
        text: 'bla',
        value: ['b', 'l', 'a'],
      });
    });
    it('should calculate text if not present', async function () {
      await converter.proxySetValue('', '', {
        value: ['b', 'l', 'a'],
      });
      responseBody.should.eql({
        text: 'bla',
        value: ['b', 'l', 'a'],
      });
    });
    it('should keep the response body unchanged if both value and text are present', async function () {
      await converter.proxySetValue('', '', {
        text: 'bla',
        value: ['b', 'l', 'a'],
      });
      responseBody.should.eql({
        text: 'bla',
        value: ['b', 'l', 'a'],
      });
    });
  });
  describe('getProperty', function () {
    let jsonwpConverter, w3cConverter;
    before(function () {
      for (let command of COMMAND_URLS_CONFLICTS) {
        if (command.commandNames.includes('getProperty')) {
          jsonwpConverter = command.jsonwpConverter;
          w3cConverter = command.w3cConverter;
        }
      }
    });
    it('should convert "property/value" to "attribute/value"', function () {
      jsonwpConverter('/session/123/element/456/property/value').should.equal('/session/123/element/456/attribute/value');
    });
    it('should convert "property/:somePropName" to "attribute/:somePropName"', function () {
      jsonwpConverter('/session/123/element/456/property/somePropName').should.equal('/session/123/element/456/attribute/somePropName');
    });
    it('should not convert from JSONWP to W3C', function () {
      w3cConverter('/session/123/element/456/attribute/someAttr').should.equal('/session/123/element/456/attribute/someAttr');
      w3cConverter('/session/123/element/456/property/someProp').should.equal('/session/123/element/456/property/someProp');
    });
  });
});

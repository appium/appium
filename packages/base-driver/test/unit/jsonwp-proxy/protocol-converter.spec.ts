import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import _ from 'lodash';
import {PROTOCOLS} from '../../../lib/constants';
import ProtocolConverter, {
  COMMAND_URLS_CONFLICTS,
} from '../../../lib/jsonwp-proxy/protocol-converter';

chai.use(chaiAsPromised);

const {MJSONWP, W3C} = PROTOCOLS;

describe('Protocol Converter', function () {
  describe('getTimeoutRequestObjects', function () {
    let converter: ProtocolConverter;
    before(function () {
      converter = new ProtocolConverter(_.noop as any);
    });
    it('should take W3C inputs and produce MJSONWP compatible objects', function () {
      converter.downstreamProtocol = MJSONWP;
      const timeoutObjects = converter.getTimeoutRequestObjects({script: 100});
      expect(timeoutObjects.length).to.equal(1);
      expect(timeoutObjects[0]).to.eql({type: 'script', ms: 100});
    });
    it('should ignore invalid entries while converting from W3C', function () {
      converter.downstreamProtocol = MJSONWP;
      const timeoutObjects = converter.getTimeoutRequestObjects({
        script: 100,
        sessionId: '5432a4f3-cd89-4781-8905-ea9d3150840c',
        bar: -1,
        baz: undefined,
      } as any);
      expect(timeoutObjects.length).to.equal(1);
      expect(timeoutObjects[0]).to.eql({type: 'script', ms: 100});
    });
    it('should take multiple W3C timeouts and produce multiple MJSONWP compatible objects', function () {
      converter.downstreamProtocol = MJSONWP;
      const [scriptTimeout, pageLoadTimeout, implicitTimeout] =
        converter.getTimeoutRequestObjects({
          script: 100,
          pageLoad: 200,
          implicit: 300,
        });
      expect(scriptTimeout).to.eql({
        type: 'script',
        ms: 100,
      });
      expect(pageLoadTimeout).to.eql({
        type: 'page load',
        ms: 200,
      });
      expect(implicitTimeout).to.eql({
        type: 'implicit',
        ms: 300,
      });
    });
    it('should take MJSONWP input and produce W3C compatible object', function () {
      converter.downstreamProtocol = W3C;
      const timeoutObjects = converter.getTimeoutRequestObjects({
        type: 'implicit',
        ms: 300,
      });
      expect(timeoutObjects.length).to.equal(1);
      expect(timeoutObjects[0]).to.eql({implicit: 300});
    });
    it('should not change the input if protocol name is unknown', function () {
      converter.downstreamProtocol = null as any;
      const timeoutObjects = converter.getTimeoutRequestObjects({
        type: 'implicit',
        ms: 300,
      });
      expect(timeoutObjects.length).to.equal(1);
      expect(timeoutObjects[0]).to.eql({type: 'implicit', ms: 300});
    });
    it('should not change the input if protocol name is unchanged', function () {
      converter.downstreamProtocol = MJSONWP;
      const timeoutObjects = converter.getTimeoutRequestObjects({
        type: 'implicit',
        ms: 300,
      });
      expect(timeoutObjects.length).to.equal(1);
      expect(timeoutObjects[0]).to.eql({type: 'implicit', ms: 300});
    });
  });

  describe('setValue', function () {
    let converter: ProtocolConverter;
    let responseBody: any;
    before(function () {
      responseBody = null;
      converter = new ProtocolConverter(((url, method, body) => {
        responseBody = body;
      }) as any);
    });
    beforeEach(function () {
      responseBody = {};
    });

    it('should calculate value if not present', async function () {
      await converter.proxySetValue('', '', {
        text: 'bla',
      });
      expect(responseBody).to.eql({
        text: 'bla',
        value: ['b', 'l', 'a'],
      });
    });
    it('should calculate text if not present', async function () {
      await converter.proxySetValue('', '', {
        value: ['b', 'l', 'a'],
      });
      expect(responseBody).to.eql({
        text: 'bla',
        value: ['b', 'l', 'a'],
      });
    });
    it('should keep the response body unchanged if both value and text are present', async function () {
      await converter.proxySetValue('', '', {
        text: 'bla',
        value: ['b', 'l', 'a'],
      });
      expect(responseBody).to.eql({
        text: 'bla',
        value: ['b', 'l', 'a'],
      });
    });
  });
  describe('getProperty', function () {
    let jsonwpConverter: (url: string) => string;
    let w3cConverter: (url: string) => string;
    before(function () {
      for (const command of COMMAND_URLS_CONFLICTS) {
        if (command.commandNames.includes('getProperty')) {
          jsonwpConverter = command.jsonwpConverter;
          w3cConverter = command.w3cConverter;
        }
      }
    });
    it('should convert "property/value" to "attribute/value"', function () {
      expect(jsonwpConverter('/session/123/element/456/property/value')).to.equal(
        '/session/123/element/456/attribute/value'
      );
    });
    it('should convert "property/:somePropName" to "attribute/:somePropName"', function () {
      expect(
        jsonwpConverter('/session/123/element/456/property/somePropName')
      ).to.equal('/session/123/element/456/attribute/somePropName');
    });
    it('should not convert from JSONWP to W3C', function () {
      expect(
        w3cConverter('/session/123/element/456/attribute/someAttr')
      ).to.equal('/session/123/element/456/attribute/someAttr');
      expect(
        w3cConverter('/session/123/element/456/property/someProp')
      ).to.equal('/session/123/element/456/property/someProp');
    });
  });
});

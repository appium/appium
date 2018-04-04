// transpile:mocha

import '../..'; // NOTE: For some reason this file needs to be imported to prevent a babel error
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { parseProtocol } from '../../lib/protocol/protocol';

chai.should();
chai.use(chaiAsPromised);

describe('Protocol', async function () {

  describe('#parseProtocol', function () {
    it('should parse {protocol: "MJSONWP"} as MJSONWP', function () {
      parseProtocol({protocol: 'MJSONWP', value: undefined}).should.eql({isW3C: false, isMJSONWP: true, value: undefined});
    });
    it('should parse {protocol: "W3C"} as W3C', function () {
      parseProtocol({protocol: 'W3C', value: undefined}).should.eql({isW3C: true, isMJSONWP: false, value: undefined});
    });
    it('should parse {protocol: "MJSONWP", value: false} as MJSONWP with value: false', function () {
      parseProtocol({protocol: 'MJSONWP', value: false}).should.eql({isW3C: false, isMJSONWP: true, value: false});
    });
    it('should parse {protocol: "W3C", value: 0} as W3C with value: 0', function () {
      parseProtocol({protocol: 'W3C', value: 0}).should.eql({isW3C: true, isMJSONWP: false, value: 0});
    });
    it('should parse {protocol: "MJSONWP", value: "string"}', function () {
      parseProtocol({protocol: 'MJSONWP', value: "string"}).should.eql({isW3C: false, isMJSONWP: true, value: "string"});
    });
    it('should parse {protocol: "W3C", value: {obj}}', function () {
      const value = {hello: 'world', goodbye: 'whirl'};
      parseProtocol({protocol: 'MJSONWP', value}).should.eql({isW3C: false, isMJSONWP: true, value});
    });
    it('should throw if {protocol: "MJSONWP", error}', function () {
      (() => parseProtocol({protocol: 'W3C', error: new Error('some error')})).should.throw(/some error/);
    });
  });
});

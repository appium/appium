import chai from 'chai';
import { runQuery, transformQuery, getNodeAttrVal } from '../../lib/xpath';
import { transformSourceXml } from '../../lib/source';
import { XML_IOS } from '../fixtures';

const should = chai.should();

describe('xpath functions', function () {
  describe('runQuery', function () {
    it('should run an xpath query on an XML string and return nodes', function () {
      runQuery('//*', XML_IOS).should.have.length(31);
      runQuery('//XCUIElementTypeTextField', XML_IOS).should.have.length(1);
    });
  });
  describe('transformQuery', function () {
    it('should transform a query into a single new query', function () {
      const {xml} = transformSourceXml(XML_IOS, 'ios', {addIndexPath: true});
      transformQuery('//TextInput', xml, false)
        .should.eql('/*[1]/*[1]/*[1]/*[1]/*[2]/*[1]/*[1]/*[1]/*[1]/*[1]/*[1]/*[2]/*[1]/*[1]/*[1]');
    });
    it('should transform a query into a multiple new queries if asked', function () {
      const {xml} = transformSourceXml(XML_IOS, 'ios', {addIndexPath: true});
      transformQuery('//Window', xml, true)
        .split('|')
        .should.have.length(2);
    });
    it('should return null for queries that dont find anything', function () {
      const {xml} = transformSourceXml(XML_IOS, 'ios', {addIndexPath: true});
      should.not.exist(transformQuery('//blah', xml, false));
    });
  });
  describe ('getNodeAttrVal', function () {
    it('should get the attribute for a node', function () {
      const node = runQuery('//XCUIElementTypeTextField', XML_IOS)[0];
      getNodeAttrVal(node, 'name').should.eql('username');
    });
    it('should throw an error if the attr does not exist', function () {
      const node = runQuery('//XCUIElementTypeTextField', XML_IOS)[0];
      should.throw(() => getNodeAttrVal(node, 'foo'));
    });
  });
});

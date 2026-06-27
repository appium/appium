import {runQuery, transformQuery, getNodeAttrVal} from '../../lib/xpath';
import {transformSourceXml} from '../../lib/source';
import {FIXTURES, readFixture} from '../fixtures';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {describe, it} from 'node:test';

use(chaiAsPromised);

describe('xpath functions', function () {
  describe('runQuery', function () {
    it('should run an xpath query on an XML string and return nodes', async function () {
      expect(runQuery('//*', await readFixture(FIXTURES.XML_IOS))).to.have.length(31);
      expect(
        runQuery('//XCUIElementTypeTextField', await readFixture(FIXTURES.XML_IOS)),
      ).to.have.length(1);
    });
  });
  describe('transformQuery', function () {
    it('should transform a query into a single new query', async function () {
      const {xml} = await transformSourceXml(await readFixture(FIXTURES.XML_IOS), 'ios', {
        addIndexPath: true,
      });
      expect(transformQuery('//TextInput', xml, false)).to.eql(
        '/*[1]/*[1]/*[1]/*[1]/*[2]/*[1]/*[1]/*[1]/*[1]/*[1]/*[1]/*[2]/*[1]/*[1]/*[1]',
      );
    });
    it('should transform a query into a multiple new queries if asked', async function () {
      const {xml} = await transformSourceXml(await readFixture(FIXTURES.XML_IOS), 'ios', {
        addIndexPath: true,
      });
      expect(transformQuery('//Window', xml, true)?.split('|')).to.have.length(2);
    });
    it('should return null for queries that dont find anything', async function () {
      const {xml} = await transformSourceXml(await readFixture(FIXTURES.XML_IOS), 'ios', {
        addIndexPath: true,
      });
      expect(transformQuery('//blah', xml, false)).to.be.null;
    });
  });
  describe('getNodeAttrVal', function () {
    it('should get the attribute for a node', async function () {
      const node = runQuery('//XCUIElementTypeTextField', await readFixture(FIXTURES.XML_IOS))[0];
      expect(getNodeAttrVal(node, 'name')).to.eql('username');
    });
    it('should throw an error if the attr does not exist', async function () {
      const node = runQuery('//XCUIElementTypeTextField', await readFixture(FIXTURES.XML_IOS))[0];
      expect(() => getNodeAttrVal(node, 'foo')).to.throw();
    });
  });
});

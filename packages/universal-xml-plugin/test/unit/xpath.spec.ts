import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {transformSourceXml} from '../../lib/source.js';
import {getNodeAttrVal, runQuery, transformQuery} from '../../lib/xpath.js';
import {FIXTURES, readFixture} from '../fixtures/index.js';

describe('xpath functions', function () {
  describe('runQuery', function () {
    it('should run an xpath query on an XML string and return nodes', async function () {
      assert.equal(runQuery('//*', await readFixture(FIXTURES.XML_IOS)).length, 31);
      assert.equal(runQuery('//XCUIElementTypeTextField', await readFixture(FIXTURES.XML_IOS)).length, 1);
    });
  });
  describe('transformQuery', function () {
    it('should transform a query into a single new query', async function () {
      const {xml} = await transformSourceXml(await readFixture(FIXTURES.XML_IOS), 'ios', {
        addIndexPath: true,
      });
      assert.equal(
        transformQuery('//TextInput', xml, false),
        '/*[1]/*[1]/*[1]/*[2]/*[1]/*[1]/*[1]/*[1]/*[1]/*[1]/*[2]/*[1]/*[1]/*[1]',
      );
    });
    it('should transform a query into a multiple new queries if asked', async function () {
      const {xml} = await transformSourceXml(await readFixture(FIXTURES.XML_IOS), 'ios', {
        addIndexPath: true,
      });
      assert.equal(transformQuery('//Window', xml, true), '/*[1]/*[1] | /*[1]/*[2]');
    });
    it('should skip nodes that have no index path', async function () {
      const {xml} = await transformSourceXml(await readFixture(FIXTURES.XML_IOS), 'ios', {
        addIndexPath: true,
      });
      // the ios root node is not part of the hierarchy the driver queries, so it cannot be located
      assert.equal(transformQuery('//UI', xml, false), null);
    });
    it('should return null for queries that dont find anything', async function () {
      const {xml} = await transformSourceXml(await readFixture(FIXTURES.XML_IOS), 'ios', {
        addIndexPath: true,
      });
      assert.equal(transformQuery('//blah', xml, false), null);
    });
  });
  describe('getNodeAttrVal', function () {
    it('should get the attribute for a node', async function () {
      const node = runQuery('//XCUIElementTypeTextField', await readFixture(FIXTURES.XML_IOS))[0];
      assert.equal(getNodeAttrVal(node, 'name'), 'username');
    });
    it('should throw an error if the attr does not exist', async function () {
      const node = runQuery('//XCUIElementTypeTextField', await readFixture(FIXTURES.XML_IOS))[0];
      assert.throws(() => getNodeAttrVal(node, 'foo'));
    });
  });
});

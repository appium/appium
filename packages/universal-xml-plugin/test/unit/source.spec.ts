import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {transformAttrs, transformChildNodes, transformSourceXml} from '../../lib/source';
import {FIXTURES, readFixture} from '../fixtures';

describe('source functions', function () {
  describe('transformSourceXml', function () {
    it('should transform an xml doc based on platform', async function () {
      const {
        xml,
        unknowns: {nodes, attrs},
      } = await transformSourceXml(await readFixture(FIXTURES.XML_IOS), 'ios');
      assert.equal(xml, await readFixture(FIXTURES.XML_IOS_TRANSFORMED));
      assert.deepEqual(nodes, []);
      assert.deepEqual(attrs, []);
    });
    it('should transform an xml doc and include index path', async function () {
      const {
        xml,
        unknowns: {nodes, attrs},
      } = await transformSourceXml(await readFixture(FIXTURES.XML_IOS), 'ios', {
        addIndexPath: true,
      });
      assert.equal(xml, await readFixture(FIXTURES.XML_IOS_TRANSFORMED_INDEX_PATH));
      assert.deepEqual(nodes, []);
      assert.deepEqual(attrs, []);
    });
    it('should transform an xml doc and return any unknown nodes or attrs', async function () {
      const {
        xml,
        unknowns: {nodes, attrs},
      } = await transformSourceXml(await readFixture(FIXTURES.XML_IOS_EDGE), 'ios');
      assert.equal(xml, await readFixture(FIXTURES.XML_IOS_EDGE_TRANSFORMED));
      assert.deepEqual(nodes, ['SomeRandoElement']);
      assert.deepEqual(attrs, ['oddAttribute']);
    });
  });
  describe('transformChildNodes', function () {
    it('should loop through child nodes of an object and transform them based on platform', function () {
      const node = {
        XCUIElementTypeIcon: [{}],
        XCUIElementTypeKey: [{}],
        XCUIElementTypeTab: [{}],
      };
      const metadata = {};
      assert.deepEqual(transformChildNodes(node, Object.keys(node), 'ios', metadata), {
        nodes: [],
        attrs: [],
      });
      assert.deepEqual(node, {Button: [{}, {}], Icon: [{}]});
    });
    it('should leave unknown nodes intact and add them to unknowns list', function () {
      const node = {
        XCUIElementTypeIcon: [{}],
        UnknownThingo: [{}],
        XCUIElementTypeTab: [{}],
      };
      const metadata = {};
      assert.deepEqual(transformChildNodes(node, Object.keys(node), 'ios', metadata), {
        nodes: ['UnknownThingo'],
        attrs: [],
      });
      assert.deepEqual(node, {Button: [{}], UnknownThingo: [{}], Icon: [{}]});
    });
    it('should leave nodes for other platforms intact and add them to unknowns list', function () {
      const node = {
        XCUIElementTypeIcon: [{}],
        'android.widget.EditText': [{}],
        XCUIElementTypeTab: [{}],
      };
      const metadata = {};
      assert.deepEqual(transformChildNodes(node, Object.keys(node), 'ios', metadata), {
        nodes: ['android.widget.EditText'],
        attrs: [],
      });
      assert.deepEqual(node, {
        Button: [{}],
        'android.widget.EditText': [{}],
        Icon: [{}],
      });
    });
  });
  describe('transformAttrs', function () {
    it('should remove attributes in the REMOVE_ATTRS list', function () {
      const obj: any = {'@_type': 'foo', '@_package': 'yes', '@_class': 'lol'};
      const attrs = Object.keys(obj);
      const unknowns = transformAttrs(obj, attrs, 'ios');
      assert.deepEqual(obj, {});
      assert.deepEqual(unknowns, []);
    });
    it('should translate attributes for the platform', function () {
      const obj: any = {'@_type': 'foo', '@_resource-id': 'someId'};
      const attrs = Object.keys(obj);
      const unknowns = transformAttrs(obj, attrs, 'android');
      assert.deepEqual(obj, {'@_id': 'someId'});
      assert.deepEqual(unknowns, []);
    });
    it('should not translate unknown attributes and return them in the unknowns list', function () {
      const obj: any = {
        '@_type': 'foo',
        '@_resource-id': 'someId',
        '@_rando': 'lorian',
      };
      const attrs = Object.keys(obj);
      const unknowns = transformAttrs(obj, attrs, 'android');
      assert.deepEqual(obj, {'@_id': 'someId', '@_rando': 'lorian'});
      assert.deepEqual(unknowns, ['rando']);
    });
    it('should not translate attributes for a different platform', function () {
      const obj: any = {'@_type': 'foo', '@_resource-id': 'someId'};
      const attrs = Object.keys(obj);
      const unknowns = transformAttrs(obj, attrs, 'ios');
      assert.deepEqual(obj, {'@_resource-id': 'someId'});
      assert.deepEqual(unknowns, ['resource-id']);
    });
  });
});

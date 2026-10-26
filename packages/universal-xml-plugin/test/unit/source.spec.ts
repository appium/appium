import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {transformAttrs, transformChildNodes, transformSourceXml} from '../../lib/source.js';
import {FIXTURES, readFixture} from '../fixtures/index.js';

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
    it('should keep android siblings in the order they have on the device', async function () {
      const {xml} = await transformSourceXml(await readFixture(FIXTURES.XML_ANDROID_SIBLINGS), 'android');
      assert.equal(xml, await readFixture(FIXTURES.XML_ANDROID_SIBLINGS_TRANSFORMED));
    });
    it('should keep ios siblings in the order they have on the device', async function () {
      const {xml} = await transformSourceXml(await readFixture(FIXTURES.XML_IOS_SIBLINGS), 'ios');
      assert.equal(xml, await readFixture(FIXTURES.XML_IOS_SIBLINGS_TRANSFORMED));
    });
  });
  describe('transformChildNodes', function () {
    it('should loop through child nodes and transform them based on platform', function () {
      const childNodes = [
        {XCUIElementTypeKey: [], ':@': {'@_type': 'XCUIElementTypeKey', '@_name': 'q'}},
        {XCUIElementTypeIcon: []},
        {XCUIElementTypeTab: []},
      ];
      const metadata = {};
      assert.deepEqual(transformChildNodes(childNodes, 'ios', metadata), {
        nodes: [],
        attrs: [],
      });
      assert.deepEqual(childNodes, [{Button: [], ':@': {'@_axId': 'q'}}, {Icon: []}, {Button: []}]);
    });
    it('should leave unknown nodes intact and add them to unknowns list', function () {
      const childNodes = [{XCUIElementTypeIcon: []}, {UnknownThingo: []}, {XCUIElementTypeTab: []}];
      const metadata = {};
      assert.deepEqual(transformChildNodes(childNodes, 'ios', metadata), {
        nodes: ['UnknownThingo'],
        attrs: [],
      });
      assert.deepEqual(childNodes, [{Icon: []}, {UnknownThingo: []}, {Button: []}]);
    });
    it('should leave nodes for other platforms intact and add them to unknowns list', function () {
      const childNodes = [{XCUIElementTypeIcon: []}, {'android.widget.EditText': []}, {XCUIElementTypeTab: []}];
      const metadata = {};
      assert.deepEqual(transformChildNodes(childNodes, 'ios', metadata), {
        nodes: ['android.widget.EditText'],
        attrs: [],
      });
      assert.deepEqual(childNodes, [{Icon: []}, {'android.widget.EditText': []}, {Button: []}]);
    });
    it('should leave text content intact', function () {
      const childNodes = [{'#text': 'hello'}, {XCUIElementTypeTab: []}];
      const metadata = {};
      assert.deepEqual(transformChildNodes(childNodes, 'ios', metadata), {
        nodes: [],
        attrs: [],
      });
      assert.deepEqual(childNodes, [{'#text': 'hello'}, {Button: []}]);
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
    it('should keep the enabled attribute on both platforms', function () {
      for (const platform of ['ios', 'android']) {
        const obj: any = {'@_enabled': 'false'};
        const unknowns = transformAttrs(obj, Object.keys(obj), platform);
        assert.deepEqual(obj, {'@_enabled': 'false'});
        assert.deepEqual(unknowns, []);
      }
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

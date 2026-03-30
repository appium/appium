import {
  XML_IOS,
  XML_IOS_TRANSFORMED,
  XML_IOS_TRANSFORMED_INDEX_PATH,
  XML_IOS_EDGE,
  XML_IOS_EDGE_TRANSFORMED,
} from '../fixtures';
import {transformAttrs, transformChildNodes, transformSourceXml} from '../../lib/source';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

describe('source functions', function () {
  describe('transformSourceXml', function () {
    it('should transform an xml doc based on platform', async function () {
      const {
        xml,
        unknowns: {nodes, attrs},
      } = await transformSourceXml(XML_IOS, 'ios');
      expect(xml).to.eql(XML_IOS_TRANSFORMED);
      expect(nodes).to.eql([]);
      expect(attrs).to.eql([]);
    });
    it('should transform an xml doc and include index path', async function () {
      const {
        xml,
        unknowns: {nodes, attrs},
      } = await transformSourceXml(XML_IOS, 'ios', {addIndexPath: true});
      expect(xml).to.eql(XML_IOS_TRANSFORMED_INDEX_PATH);
      expect(nodes).to.eql([]);
      expect(attrs).to.eql([]);
    });
    it('should transform an xml doc and return any unknown nodes or attrs', async function () {
      const {
        xml,
        unknowns: {nodes, attrs},
      } = await transformSourceXml(XML_IOS_EDGE, 'ios');
      expect(xml).to.eql(XML_IOS_EDGE_TRANSFORMED);
      expect(nodes).to.eql(['SomeRandoElement']);
      expect(attrs).to.eql(['oddAttribute']);
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
      expect(transformChildNodes(node, Object.keys(node), 'ios', metadata)).to.eql({
        nodes: [],
        attrs: [],
      });
      expect(node).to.eql({Button: [{}, {}], Icon: [{}]});
    });
    it('should leave unknown nodes intact and add them to unknowns list', function () {
      const node = {
        XCUIElementTypeIcon: [{}],
        UnknownThingo: [{}],
        XCUIElementTypeTab: [{}],
      };
      const metadata = {};
      expect(transformChildNodes(node, Object.keys(node), 'ios', metadata)).to.eql({
        nodes: ['UnknownThingo'],
        attrs: [],
      });
      expect(node).to.eql({Button: [{}], UnknownThingo: [{}], Icon: [{}]});
    });
    it('should leave nodes for other platforms intact and add them to unknowns list', function () {
      const node = {
        XCUIElementTypeIcon: [{}],
        'android.widget.EditText': [{}],
        XCUIElementTypeTab: [{}],
      };
      const metadata = {};
      expect(transformChildNodes(node, Object.keys(node), 'ios', metadata)).to.eql({
        nodes: ['android.widget.EditText'],
        attrs: [],
      });
      expect(node).to.eql({
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
      expect(obj).to.eql({});
      expect(unknowns).to.eql([]);
    });
    it('should translate attributes for the platform', function () {
      const obj: any = {'@_type': 'foo', '@_resource-id': 'someId'};
      const attrs = Object.keys(obj);
      const unknowns = transformAttrs(obj, attrs, 'android');
      expect(obj).to.eql({'@_id': 'someId'});
      expect(unknowns).to.eql([]);
    });
    it('should not translate unknown attributes and return them in the unknowns list', function () {
      const obj: any = {
        '@_type': 'foo',
        '@_resource-id': 'someId',
        '@_rando': 'lorian',
      };
      const attrs = Object.keys(obj);
      const unknowns = transformAttrs(obj, attrs, 'android');
      expect(obj).to.eql({'@_id': 'someId', '@_rando': 'lorian'});
      expect(unknowns).to.eql(['rando']);
    });
    it('should not translate attributes for a different platform', function () {
      const obj: any = {'@_type': 'foo', '@_resource-id': 'someId'};
      const attrs = Object.keys(obj);
      const unknowns = transformAttrs(obj, attrs, 'ios');
      expect(obj).to.eql({'@_resource-id': 'someId'});
      expect(unknowns).to.eql(['resource-id']);
    });
  });
});

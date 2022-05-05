import chai from 'chai';
import {
  XML_IOS,
  XML_IOS_TRANSFORMED,
  XML_IOS_TRANSFORMED_INDEX_PATH,
  XML_IOS_EDGE,
  XML_IOS_EDGE_TRANSFORMED,
} from '../fixtures';
import {transformAttrs, transformChildNodes, transformSourceXml} from '../../lib/source';

chai.should();

describe('source functions', function () {
  describe('transformSourceXml', function () {
    it('should transform an xml doc based on platform', function () {
      const {
        xml,
        unknowns: {nodes, attrs},
      } = transformSourceXml(XML_IOS, 'ios');
      xml.should.eql(XML_IOS_TRANSFORMED);
      nodes.should.eql([]);
      attrs.should.eql([]);
    });
    it('should transform an xml doc and include index path', function () {
      const {
        xml,
        unknowns: {nodes, attrs},
      } = transformSourceXml(XML_IOS, 'ios', {addIndexPath: true});
      xml.should.eql(XML_IOS_TRANSFORMED_INDEX_PATH);
      nodes.should.eql([]);
      attrs.should.eql([]);
    });
    it('should transform an xml doc and return any unknown nodes or attrs', function () {
      const {
        xml,
        unknowns: {nodes, attrs},
      } = transformSourceXml(XML_IOS_EDGE, 'ios');
      xml.should.eql(XML_IOS_EDGE_TRANSFORMED);
      nodes.should.eql(['SomeRandoElement']);
      attrs.should.eql(['oddAttribute']);
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
      transformChildNodes(node, Object.keys(node), 'ios', metadata).should.eql({
        nodes: [],
        attrs: [],
      });
      node.should.eql({Button: [{}, {}], Icon: [{}]});
    });
    it('should leave unknown nodes intact and add them to unknowns list', function () {
      const node = {
        XCUIElementTypeIcon: [{}],
        UnknownThingo: [{}],
        XCUIElementTypeTab: [{}],
      };
      const metadata = {};
      transformChildNodes(node, Object.keys(node), 'ios', metadata).should.eql({
        nodes: ['UnknownThingo'],
        attrs: [],
      });
      node.should.eql({Button: [{}], UnknownThingo: [{}], Icon: [{}]});
    });
    it('should leave nodes for other platforms intact and add them to unknowns list', function () {
      const node = {
        XCUIElementTypeIcon: [{}],
        'android.widget.EditText': [{}],
        XCUIElementTypeTab: [{}],
      };
      const metadata = {};
      transformChildNodes(node, Object.keys(node), 'ios', metadata).should.eql({
        nodes: ['android.widget.EditText'],
        attrs: [],
      });
      node.should.eql({
        Button: [{}],
        'android.widget.EditText': [{}],
        Icon: [{}],
      });
    });
  });
  describe('transformAttrs', function () {
    it('should remove attributes in the REMOVE_ATTRS list', function () {
      const obj = {'@_type': 'foo', '@_package': 'yes', '@_class': 'lol'};
      const attrs = Object.keys(obj);
      const unknowns = transformAttrs(obj, attrs, 'ios');
      obj.should.eql({});
      unknowns.should.eql([]);
    });
    it('should translate attributes for the platform', function () {
      const obj = {'@_type': 'foo', '@_resource-id': 'someId'};
      const attrs = Object.keys(obj);
      const unknowns = transformAttrs(obj, attrs, 'android');
      obj.should.eql({'@_id': 'someId'});
      unknowns.should.eql([]);
    });
    it('should not translate unknown attributes and return them in the unknowns list', function () {
      const obj = {
        '@_type': 'foo',
        '@_resource-id': 'someId',
        '@_rando': 'lorian',
      };
      const attrs = Object.keys(obj);
      const unknowns = transformAttrs(obj, attrs, 'android');
      obj.should.eql({'@_id': 'someId', '@_rando': 'lorian'});
      unknowns.should.eql(['rando']);
    });
    it('should not translate attributes for a different platform', function () {
      const obj = {'@_type': 'foo', '@_resource-id': 'someId'};
      const attrs = Object.keys(obj);
      const unknowns = transformAttrs(obj, attrs, 'ios');
      obj.should.eql({'@_resource-id': 'someId'});
      unknowns.should.eql(['resource-id']);
    });
  });
});

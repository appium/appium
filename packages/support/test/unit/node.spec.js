import {should} from 'chai';
import {node} from '../../lib';

describe('node utilities', function () {
  describe('getObjectSize', function () {
    it('should be able to calculate size of different object types', function () {
      node.getObjectSize(1).should.eql(8);
      node.getObjectSize(true).should.eql(4);
      node.getObjectSize('yolo').should.eql(8);
      node.getObjectSize(null).should.eql(0);
      node.getObjectSize({}).should.eql(0);
      node.getObjectSize(Buffer.from([1, 2, 3])).should.eql(3);
      node
        .getObjectSize({
          a: 1,
          b: 2,
          c: {
            d: 4,
          },
        })
        .should.eql(32);
    });
  });

  describe('getObjectId', function () {
    it('should be able to calculate object identifiers', function () {
      const obj1 = {};
      const obj2 = {};
      node.getObjectId({}).should.not.eql(node.getObjectId(obj1));
      node.getObjectId({}).should.not.eql(node.getObjectId(obj2));
      node.getObjectId(obj1).should.not.eql(node.getObjectId(obj2));
      node.getObjectId(obj1).should.eql(node.getObjectId(obj1));
      node.getObjectId(obj2).should.eql(node.getObjectId(obj2));
    });
  });

  describe('deepFreeze', function () {
    it('should be able to deep freeze objects', function () {
      const obj1 = {};
      node.deepFreeze(obj1).should.eql(obj1);
      const obj2 = node.deepFreeze({a: {b: 'c'}});
      should().throw(() => (obj2.a.b = 'd'));
      node.deepFreeze(1).should.eql(1);
      should().equal(node.deepFreeze(null), null);
      const obj3 = [1, {}, 3];
      should().equal(node.deepFreeze(obj3), obj3);
    });
  });
});

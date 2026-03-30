import {expect} from 'chai';
import {node} from '../../lib';
import path from 'node:path';
import _ from 'lodash';

describe('node utilities', function () {
  describe('getObjectSize', function () {
    it('should be able to calculate size of different object types', function () {
      expect(node.getObjectSize(1)).to.eql(8);
      expect(node.getObjectSize(true)).to.eql(4);
      expect(node.getObjectSize('yolo')).to.eql(8);
      expect(node.getObjectSize(null)).to.eql(0);
      expect(node.getObjectSize({})).to.eql(0);
      expect(node.getObjectSize(Buffer.from([1, 2, 3]))).to.eql(3);
      expect(
        node.getObjectSize({
          a: 1,
          b: 2,
          c: {
            d: 4,
          },
        })
      ).to.eql(32);
    });
  });

  describe('getModuleRootSync', function () {
    it("should be able to find current module's root", function () {
      expect(path.resolve(__dirname)).to.contain(
        node.getModuleRootSync('@appium/support', __filename)!
      );
    });

    it('should return null if no root is found', function () {
      expect(_.isNull(node.getModuleRootSync('yolo', __filename))).to.be.true;
    });
  });

  describe('getObjectId', function () {
    it('should be able to calculate object identifiers', function () {
      const obj1 = {};
      const obj2 = {};
      expect(node.getObjectId({})).to.not.eql(node.getObjectId(obj1));
      expect(node.getObjectId({})).to.not.eql(node.getObjectId(obj2));
      expect(node.getObjectId(obj1)).to.not.eql(node.getObjectId(obj2));
      expect(node.getObjectId(obj1)).to.eql(node.getObjectId(obj1));
      expect(node.getObjectId(obj2)).to.eql(node.getObjectId(obj2));
    });
  });

  describe('deepFreeze', function () {
    it('should be able to deep freeze objects', function () {
      const obj1 = {};
      expect(node.deepFreeze(obj1)).to.eql(obj1);
      const obj2 = node.deepFreeze({a: {b: 'c'}});
      expect(() => ((obj2 as any).a.b = 'd')).to.throw();
      expect(node.deepFreeze(1)).to.eql(1);
      expect(node.deepFreeze(null)).to.equal(null);
      const obj3 = [1, {}, 3];
      expect(node.deepFreeze(obj3)).to.equal(obj3);
    });
  });
});

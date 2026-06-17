import {expect} from 'chai';
import {mergePlainObjects, omit, omitKeys, pick, pickBy} from '../../lib/utils';

describe('utils', function () {
  describe('mergePlainObjects', function () {
    it('should deep-merge plain objects without mutating the target', function () {
      const target: Record<string, unknown> = {a: 1, nested: {x: 1, y: 2}};
      const result = mergePlainObjects(target, {b: 2, nested: {y: 3, z: 4}}, undefined);

      expect(result).to.eql({a: 1, b: 2, nested: {x: 1, y: 3, z: 4}});
      expect(target).to.eql({a: 1, nested: {x: 1, y: 2}});
    });

    it('should skip null and undefined sources', function () {
      const target: Record<string, unknown> = {a: 1};
      expect(mergePlainObjects(target, undefined, {b: 2})).to.eql({a: 1, b: 2});
      expect(mergePlainObjects(target, null as any, {b: 2})).to.eql({a: 1, b: 2});
    });

    it('should replace nested values when the source value is not a plain object', function () {
      const target: Record<string, unknown> = {nested: {a: 1}};
      expect(mergePlainObjects(target, {nested: 'replaced'})).to.eql({
        nested: 'replaced',
      });
    });
  });

  describe('omit', function () {
    it('should omit a key from a plain object', function () {
      expect(omit({a: 1, b: 2}, 'a')).to.eql({b: 2});
    });

    it('should return non-plain objects unchanged', function () {
      expect(omit(null as any, 'a')).to.equal(null);
      expect(omit('text' as any, 'a')).to.equal('text');
    });
  });

  describe('omitKeys', function () {
    it('should omit multiple keys', function () {
      expect(omitKeys({a: 1, b: 2, c: 3}, ['a', 'c'])).to.eql({b: 2});
    });

    it('should return the same object when keys is empty', function () {
      const obj = {a: 1};
      expect(omitKeys(obj, [])).to.equal(obj);
    });

    it('should return non-plain objects unchanged', function () {
      expect(omitKeys(null as any, ['a'])).to.equal(null);
    });
  });

  describe('pick', function () {
    it('should pick only the listed keys', function () {
      expect(pick({a: 1, b: 2, c: 3}, ['a', 'c'])).to.eql({a: 1, c: 3});
    });
  });

  describe('pickBy', function () {
    it('should keep entries that pass the predicate', function () {
      expect(pickBy({a: 1, b: '', c: 3}, (value) => value !== '')).to.eql({a: 1, c: 3});
    });
  });
});

import { node } from '../lib';

describe('node utilities', function () {
  describe('getObjectSize', function () {
    it('should be able to calculate size of different object types', function () {
      node.getObjectSize(1).should.eql(8);
      node.getObjectSize(true).should.eql(4);
      node.getObjectSize('yolo').should.eql(8);
      node.getObjectSize(null).should.eql(0);
      node.getObjectSize({}).should.eql(0);
      node.getObjectSize(Buffer.from([1, 2, 3])).should.eql(3);
      node.getObjectSize({
        'a': 1,
        'b': 2,
        'c': {
          'd': 4,
        }
      }).should.eql(32);
    });
  });
});

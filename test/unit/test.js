// Run with mocha by installing dev deps: npm install --dev
// more docs on writing tests with mocha can be found here:
// http://visionmedia.github.com/mocha/

var assert = require("assert");
describe('Array', function(){
  describe('#indexOf()', function(){
    it('should return -1 when the value is not present', function(){
      assert.equal(-1, [1,2,3].indexOf(5));
      assert.equal(-1, [1,2,3].indexOf(0));
    });
  });
});

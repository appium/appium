/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , should = require("should");

describeWd('execute', function(h) {
  it('should do UIAutomation commands if not in web frame', function(done) {
    h.driver.execute("UIATarget.localTarget().frontMostApp().bundleID()", function(err, value) {
      should.not.exist(err);
      value.should.equal("com.yourcompany.UICatalog");
      done();
    });
  });
  it('should not fail if UIAutomation command blows up', function(done) {
    h.driver.execute("UIATarget.foobarblah()", function(err) {
      should.exist(err);
      err.status.should.equal(17);
      done();
    });
  });
  it('should not fail with quotes', function(done) {
    h.driver.execute('console.log(\'hi\\\'s\');', function(err) {
      should.not.exist(err);
      done();
    });
  });
});

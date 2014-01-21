"use strict";

var setup = require('./setup');

describe('execute', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should do UIAutomation commands if not in web frame', function(done) {
    browser
      .execute("UIATarget.localTarget().frontMostApp().bundleID()")
        .should.eventually.include(".UICatalog")
      .nodeify(done);
  });
  it('should not fail if UIAutomation command blows up', function(done) {
    browser
      .execute("UIATarget.foobarblah()")
        .should.be.rejectedWith(/status: 17/)
      .nodeify(done);
  });
  it('should not fail with quotes', function(done) {
    browser.execute('console.log(\'hi\\\'s\');')
      .nodeify(done);
  });
});

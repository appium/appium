"use strict";

/*
 * Turns out python's implicit wait doesn't respect the functionality described
 * by WebDriver. Implemented it anyways for parity, will fix later and enable
 * this test
 */

var setup = require('./setup');

describe('command timeout', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should be settable and gettable', function(done) {
    browser
      .execute("mobile: setCommandTimeout", [{timeout: 37}])
      .execute("mobile: getCommandTimeout").should.become(37)
      .nodeify(done);
  });
});

describe('command timeout', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );
 
  it('should die with short command timeout', function(done) {
    var params = {timeout: 3};
    browser
      .execute("mobile: setCommandTimeout", [params])
      .sleep(5500)
      .elementByName('dont exist dogg')
        .should.be.rejectedWith(/status: (13|6)/)
      .nodeify(done);
  });
});

describe('command timeout', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should die with short command timeout even after mobile reset', function(done) {
    var params = {timeout: 3};
    browser
      .execute("mobile: setCommandTimeout", [params])
      .execute("mobile: reset")
      .sleep(6500)
      .elementByName('dont exist dogg')
        .should.be.rejectedWith(/status: (13|6)/)
      .nodeify(done);
  });
});

describe('command timeout', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('when set to 0 should disable itself', function(done) {
    browser
      .execute("mobile: setCommandTimeout", [{timeout: 0}])
      .sleep(3000)
      .elementByTagName('button').should.eventually.exist
      .nodeify(done);
  });
});

describe('command timeout', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('when set to false should disable itself', function(done) {
    browser
      .execute("mobile: setCommandTimeout", [{timeout: false}])
      .sleep(3000)
      .elementByTagName('button').should.eventually.exist
      .nodeify(done);
  });
});

describe('command timeout via desired caps', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should die with short command timeout', function(done) {
    browser
      .sleep(5500)
      .elementByName('dont exist dogg')
        .should.be.rejectedWith(/status: (13|6)/)
      .nodeify(done);
  });
}, null, null, {newCommandTimeout: 3});

describe('command timeout disabled via desired caps', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('when set to 0 should disable itself', function(done) {
    browser
      .sleep(3000)
      .elementByTagName('button').should.eventually.exist
      .nodeify(done);
  });
}, null, null, {newCommandTimeout: 0});

describe('command timeout disabled via desired caps', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('when set to false should disable itself', function(done) {
    browser
      .execute("mobile: setCommandTimeout", [{timeout: false}])
      .sleep(3000)
      .elementByTagName('button').should.eventually.exist
      .nodeify(done);
  });
}, null, null, {newCommandTimeout: false});

describe('check implicit wait', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );
  
  var impWaitSecs = 4;
  var impWaitCheck = function() {
    var before = new Date().getTime() / 1000;
    return browser
      .elementsByTagName('notgonnabethere').then(function(missing) {
         var after = new Date().getTime() / 1000;
         (after - before).should.be.below(impWaitSecs + 2);
         (after - before).should.be.above(impWaitSecs);
         missing.should.have.length(0);
      });
  };

   it('should set the implicit wait for finding elements', function(done) {
     browser
      .setImplicitWaitTimeout(impWaitSecs * 1000)
      .then(impWaitCheck)
      .nodeify(done);
   });

   it('should work even with a reset in the middle', function(done) {
     browser
      .setImplicitWaitTimeout(impWaitSecs * 1000)
      .then(impWaitCheck)
      .execute("mobile: reset")
      .then(impWaitCheck)
      .nodeify(done);
   });
});

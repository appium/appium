"use strict";

/*
 * Turns out python's implicit wait doesn't respect the functionality described
 * by WebDriver. Implemented it anyways for parity, will fix later and enable
 * this test
 */

var describeWd = require('../../helpers/driverblock.js').describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it;

describeWd('command timeout', function(h) {
  it('should be settable and gettable', function(done) {
    h.driver
      .execute("mobile: setCommandTimeout", [{timeout: 37}])
      .execute("mobile: getCommandTimeout").should.become(37)
      .nodeify(done);
  });
});

describeWd('command timeout', function(h) {
  it('should die with short command timeout', function(done) {
    var params = {timeout: 3};
    h.driver
      .execute("mobile: setCommandTimeout", [params])
      .sleep(5500)
      .elementByName('dont exist dogg')
      .catch(function(err) {
        [13, 6].should.include(err.status);
        throw err;
      }).should.be.rejected
      .nodeify(done);
  });
});

describeWd('command timeout', function(h) {
  it('should die with short command timeout even after mobile reset', function(done) {
    var params = {timeout: 3};
    h.driver
      .execute("mobile: setCommandTimeout", [params])
      .execute("mobile: reset")
      .sleep(6500)
      .elementByName('dont exist dogg')
      .catch(function(err) {
        [13, 6].should.include(err.status);
        throw err;
      }).should.be.rejected
      .nodeify(done);
  });
});

describeWd('command timeout', function(h) {
  it('when set to 0 should disable itself', function(done) {
    h.driver
      .execute("mobile: setCommandTimeout", [{timeout: 0}])
      .sleep(3000)
      .elementByTagName('button').should.eventually.exist
      .nodeify(done);
  });
});

describeWd('command timeout', function(h) {
  it('when set to false should disable itself', function(done) {
    h.driver
      .execute("mobile: setCommandTimeout", [{timeout: false}])
      .sleep(3000)
      .elementByTagName('button').should.eventually.exist
      .nodeify(done);
  });
});

describeWd('command timeout via desired caps', function(h) {
  it('should die with short command timeout', function(done) {
    h.driver
      .sleep(5500)
      .elementByName('dont exist dogg')
      .catch(function(err) {
        [13, 6].should.include(err.status);
        throw err;
      }).should.be.rejected
      .nodeify(done);
  });
}, null, null, {newCommandTimeout: 3});

describeWd('command timeout disabled via desired caps', function(h) {
  it('when set to 0 should disable itself', function(done) {
    h.driver
      .sleep(3000)
      .elementByTagName('button').should.eventually.exist
      .nodeify(done);
  });
}, null, null, {newCommandTimeout: 0});

describeWd('command timeout disabled via desired caps', function(h) {
  it('when set to false should disable itself', function(done) {
    h.driver
      .execute("mobile: setCommandTimeout", [{timeout: false}])
      .sleep(3000)
      .elementByTagName('button').should.eventually.exist
      .nodeify(done);
  });
}, null, null, {newCommandTimeout: false});

describeWd('check implicit wait', function(h) {
  var impWaitSecs = 4;
  var impWaitCheck = function() {
    var before = new Date().getTime() / 1000;
    return h.driver
      .elementsByTagName('notgonnabethere').then(function(missing) {
         var after = new Date().getTime() / 1000;
         (after - before).should.be.below(impWaitSecs + 2);
         (after - before).should.be.above(impWaitSecs);
         missing.should.have.length(0);
      });
  };

   it('should set the implicit wait for finding elements', function(done) {
     h.driver
      .setImplicitWaitTimeout(impWaitSecs * 1000)
      .then(impWaitCheck)
      .nodeify(done);
   });

   it('should work even with a reset in the middle', function(done) {
     h.driver
      .setImplicitWaitTimeout(impWaitSecs * 1000)
      .then(impWaitCheck)
      .execute("mobile: reset")
      .then(impWaitCheck)
      .nodeify(done);
   });
});

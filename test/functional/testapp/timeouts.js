/*global it:true */
"use strict";

/*
 * Turns out python's implicit wait doesn't respect the functionality described
 * by WebDriver. Implemented it anyways for parity, will fix later and enable
 * this test
 */

var describeWd = require('../../helpers/driverblock.js').describeForApp('TestApp')
  , should = require('should');

describeWd('command timeout', function(h) {
  it('should be settable and gettable', function(done) {
    h.driver.execute("mobile: setCommandTimeout", [{timeout: 37}], function(err) {
      should.not.exist(err);
      h.driver.execute("mobile: getCommandTimeout", function(err, res) {
        should.not.exist(err);
        res.should.eql(37);
        done();
      });
    });
  });
});

 describeWd('check implicit wait', function(h) {
   it('should set the implicit wait for finding elements', function(done) {
     h.driver.setImplicitWaitTimeout(10 * 1000, function(err) {
       should.not.exist(err);
       var before = new Date().getTime() / 1000;
       h.driver.elementsByTagName('notgonnabethere', function(err, missing) {
         var after = new Date().getTime() / 1000;
         should.ok(after - before < 12);
         should.ok(after - before > 10);
         missing.length.should.equal(0);
         done();
       });
     });
   });
   it('should set the implicit wait for finding element', function(done) {
     h.driver.setImplicitWaitTimeout(10 * 1000, function(err) {
       should.not.exist(err);
       var before = new Date().getTime() / 1000;
       h.driver.elementByTagName('notgonnabethere', function(err) {
         var after = new Date().getTime() / 1000;
         should.ok(after - before < 12);
         should.ok(after - before > 10);
         should.exist(err);
         done();
       });
     });
   });
 });

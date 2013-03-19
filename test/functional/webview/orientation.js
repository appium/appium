/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('WebViewApp')
  , _ = require('underscore')
  , should = require('should');

describeWd('orientation', function(h) {
   var testOrientation = function(specOrientation) {
     it('should get and set - ' + specOrientation, function(done) {
       h.driver.setOrientation(specOrientation, function(err, orientation) {
         orientation.should.eql(specOrientation);
         h.driver.getOrientation(function(err, orientation) {
           orientation.should.eql(specOrientation);
           done();
         });
       });
     });
   };
   _.each(["LANDSCAPE", "PORTRAIT"], testOrientation);
});

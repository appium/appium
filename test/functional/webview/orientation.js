"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('WebViewApp')
  , it = require("../../helpers/driverblock.js").it
  , _ = require('underscore');

describeWd('orientation', function(h) {
   var testOrientation = function(specOrientation) {
     it('should get and set - ' + specOrientation, function(done) {
       h.driver
        .setOrientation(specOrientation)
        .getOrientation().should.become(specOrientation)
        .nodeify(done);
     });
   };
   _.each(["LANDSCAPE", "PORTRAIT"], testOrientation);
});

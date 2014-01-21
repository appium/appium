"use strict";

var setup = require("./setup")
  , _ = require('underscore');

describe('orientation', function() {
  var browser;
  setup(this)
    .then( function(_browser) { browser = _browser; } );

   var testOrientation = function(specOrientation) {
     it('should get and set - ' + specOrientation, function(done) {
       browser
        .setOrientation(specOrientation)
        .getOrientation().should.become(specOrientation)
        .nodeify(done);
     });
   };
   _.each(["LANDSCAPE", "PORTRAIT"], testOrientation);
});

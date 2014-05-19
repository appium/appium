"use strict";

var setup = require("../common/setup-base")
  , desired = require('./desired');

describe('selendroid - uninstall app', function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should be able to uninstall the app', function (done) {
    driver
      .removeApp("com.example.android.apis")
      .nodeify(done);
  });

});

#!/usr/bin/env node
"use strict";

var authorize = require('../grunt-helpers.js').authorize;

var gruntMock = {
  fatal: function(msg) {
    console.error(msg);
    process.exit(0);
  },
  log: {
    writeln: function(msg) {
      console.log(msg);
    }
  }
};

if (require.main === module) {
  authorize(gruntMock, function(err) {
    if (err) throw err;
    console.log("Authorization successful");
  });
}

"use strict";
var path = require('path')
  , fs = require('fs')
  , env = process.env
  , exec = require('child_process').exec
  , common = require("./common.js")
  , isWindows = require("../helpers.js").isWindows()
  , eol = require('os').EOL
  , async = require('async');

function DevChecker(log) {
  this.log = log;
}
exports.DevChecker = DevChecker;

DevChecker.prototype.runAllChecks = function(cb) {
  async.series([
    this.checkMavenExistsInPath.bind(this)
  ], cb);
};

DevChecker.prototype.checkMavenExistsInPath = function(cb) {
  exec(isWindows ? "where mvn.bat" : "which mvn", { maxBuffer: 524288 }, function(err, stdout) {
    if (!err) {
      var mvnPath = isWindows ? stdout.split(eol)[0] : stdout.replace(eol, "");
      if (fs.existsSync(mvnPath)) {
        this.log.pass("Maven was found at " + mvnPath, cb);
      } else {
        this.log.fail("Maven does not exist at path " + mvnPath, cb);
      }
    } else {
      this.log.fail("Could not find mvn in path.", cb);
    }
  }.bind(this));
};

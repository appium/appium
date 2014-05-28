"use strict";

var setup = require("../common/setup-base")
  , env = require('../../helpers/env')
  , getAppPath = require('../../helpers/app').getAppPath
  , fs = require('fs')
  , path = require('path')
  , iOSSettings = require('../../../lib/devices/ios/settings.js')
  , exec = require('child_process').exec;

describe('file movements - pullFile', function () {
  var driver;
  var desired = {
    app: getAppPath('testapp')
  };
  setup(this, desired).then(function (d) { driver = d; });

  it('should be able to fetch the Address book', function (done) {
    driver
      .pullFile('Library/AddressBook/AddressBook.sqlitedb')
      .then(function (data) {
        var stringData = new Buffer(data, 'base64').toString();
        return stringData.indexOf('SQLite').should.not.equal(-1);
      })
    .nodeify(done);
  });
  it('should not be able to fetch something that does not exist', function (done) {
    driver
      .pullFile('Library/AddressBook/nothere.txt')
      .should.eventually.be.rejectedWith(/13/)
    .nodeify(done);
  });
  describe('for a .app @skip-ci', function () {
    // TODO: skipping ci because of local files use, to review.
    var fileContent = "IAmTheVeryModelOfAModernMajorTestingTool";
    var fileName = "someFile.tmp";
    var fullPath = "";
    before(function (done) {
      var pv = env.CAPS.platformVersion || '7.1';
      var simRoots = iOSSettings.getSimRootsWithVersion(pv);
      if (simRoots.length < 1) {
        return done(new Error("Didn't find any simulator directories"));
      }
      var basePath = path.resolve(simRoots[0], 'Applications')
                      .replace(/\s/g, '\\ ');

      var findCmd = 'find ' + basePath + ' -name "testapp.app"';
      exec(findCmd, function (err, stdout) {
        if (err) return done(err);
        if (!stdout) return done(new Error("Could not find testapp.app"));
        var appRoot = stdout.replace(/\n$/, '');
        fullPath = path.resolve(appRoot, fileName);
        fs.writeFile(fullPath, fileContent, done);
      });
    });
    after(function (done) {
      if (fullPath) {
        fs.unlink(fullPath, done);
      } else {
        done();
      }
    });
    it('should be able to fetch a file from the app directory', function (done) {
      var arg = path.resolve('/testapp.app', fileName);
      driver
        .pullFile(arg)
        .then(function (data) {
          var stringData = new Buffer(data, 'base64').toString();
          return stringData.should.equal(fileContent);
        })
        .nodeify(done);
    });
  });
});

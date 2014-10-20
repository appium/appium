"use strict";

var setup = require("../common/setup-base")
  , env = require('../../helpers/env')
  , getAppPath = require('../../helpers/app').getAppPath
  , fs = require('fs')
  , path = require('path')
  , Readable = require('stream').Readable
  , Simulator = require('../../../lib/devices/ios/simulator.js')
  , xcode = require('../../../lib/devices/ios/xcode.js')
  , exec = require('child_process').exec
  , getSimUdid = require('../../helpers/sim-udid.js').getSimUdid
  , Unzip = require('unzip');

describe('file movements - pullFile and pushFile', function () {
  var driver;
  var desired = {
    app: getAppPath('TestApp')
  };
  setup(this, desired).then(function (d) { driver = d; });

  it('should not be able to fetch a file from the file system at large', function (done) {
    driver
      .pullFile(__filename)
      .should.be.rejected
    .nodeify(done);
  });

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

  it('should be able to push and pull a file', function (done) {
    var stringData = "random string data " + Math.random();
    var base64Data = new Buffer(stringData).toString('base64');
    var remotePath = 'Library/AppiumTest/remote.txt';

    driver
      .pushFile(remotePath, base64Data)
      .pullFile(remotePath)
      .then(function (remoteData64) {
        var remoteData = new Buffer(remoteData64, 'base64').toString();
        remoteData.should.equal(stringData);
      })
      .nodeify(done);
  });

  describe('for a .app @skip-ci', function () {
    // TODO: skipping ci because of local files use, to review.
    var fileContent = "IAmTheVeryModelOfAModernMajorTestingTool";
    var fileName = "someFile.tmp";
    var fullPath = "";
    before(function (done) {
      var pv = env.CAPS.platformVersion || '7.1';
      var ios8 = parseFloat(pv) >= 8;
      xcode.getiOSSDKVersion(function (err, sdk) {
        if (err) return done(err);
        var next = function (udid) {
          var sim = new Simulator({
            platformVer: pv,
            sdkVer: sdk,
            udid: udid
          });
          var simRoots = sim.getDirs();
          if (simRoots.length < 1) {
            return done(new Error("Didn't find any simulator directories"));
          }
          var basePath;
          if (ios8) {
            // ios8 apps are stored in a different directory structure, need
            // to navigate down a few more here
            basePath = path.resolve(simRoots[0], 'Containers', 'Bundle',
                                       'Application');
          } else {
            basePath = path.resolve(simRoots[0], 'Applications');
          }
          basePath = basePath.replace(/\s/g, '\\ ');
          var findCmd = 'find ' + basePath + ' -name "TestApp.app"';
          exec(findCmd, function (err, stdout) {
            if (err) return done(err);
            if (!stdout) return done(new Error("Could not find testapp.app"));
            var appRoot = stdout.replace(/\n$/, '');
            fullPath = path.resolve(appRoot, fileName);
            fs.writeFile(fullPath, fileContent, done);
          });
        };
        if (parseFloat(sdk) >= 8) {
          getSimUdid('6', sdk, env.CAPS, function (err, udid) {
            if (err) return done(err);
            next(udid);
          });
        } else {
          next();
        }
      });
    });

    it('should be able to fetch a file from the app directory', function (done) {
      var arg = path.resolve('/TestApp.app', fileName);
      driver
        .pullFile(arg)
        .then(function (data) {
          var stringData = new Buffer(data, 'base64').toString();
          return stringData.should.equal(fileContent);
        })
        .nodeify(done);
    });
  });

  describe('file movements - pullFolder', function () {
    it('should pull all the files in Library/AddressBook', function (done) {
      var entryCount = 0;
      driver
        .pullFolder('Library/AddressBook')
        .then(function (data) {
          var zipStream = new Readable();
          zipStream._read = function noop() {};
          zipStream
            .pipe(Unzip.Parse())
            .on('entry', function (entry) {
              entryCount++;
              entry.autodrain();
            })
            .on('close', function () {
              entryCount.should.be.above(1);
              done();
            });

          zipStream.push(data, 'base64');
          zipStream.push(null);
        });
    });

    it('should not pull folders from file system', function (done) {
      driver
        .pullFolder(__dirname)
          .should.be.rejected
        .nodeify(done);
    });

    it('should not be able to fetch a folder that does not exist', function (done) {
      driver
        .pullFolder('Library/Rollodex')
          .should.eventually.be.rejectedWith(/13/)
        .nodeify(done);
    });
  });
});

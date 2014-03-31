"use strict";

var setup = require("../common/setup-base")
  , env = require('../../helpers/env')
  , getAppPath = require('../../helpers/app').getAppPath
  , fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec;

describe('pullFile', function () {
  var driver;
  var desired = {
      app: getAppPath('testapp')
    , platformName: 'iPhone Simulator'
    };
  setup(this, desired).then(function (d) { driver = d; });

  it('should be able to fetch the Address book', function (done) {
    var args = {path: 'Library/AddressBook/AddressBook.sqlitedb'};
    driver
      .execute('mobile: pullFile', [args]).then(function (data) {
        var stringData = new Buffer(data, 'base64').toString();
        return stringData.indexOf('SQLite').should.not.equal(-1);
      })
    .nodeify(done);
  });
  describe('for a .app', function () {
    var fileContent = "IAmTheVeryModelOfAModernMajorTestingTool";
    var fileName = "someFile.tmp";
    var fullPath = "";
    before(function (done) {
      var u = process.env.USER;
      var pv = env.CAPS.version || '7.1';
      var basePath = path.resolve('/Users', u, 'Library/Application\\ Support',
                                  'iPhone\\ Simulator', pv, 'Applications');

      var findCmd = 'find ' + basePath + ' -name "testapp.app"';
      exec(findCmd, function (err, stdout) {
        if (err) throw (err);
        var appRoot = stdout.replace(/\n$/, '');
        fullPath = path.resolve(appRoot, fileName);
        fs.writeFile(fullPath, fileContent, function (err) {
          if (err) throw (err);
        });
        done();
      });
    });
    after(function (done) {
      if (fullPath) {
        fs.unlink(fullPath, function (err) {
          if (err) throw err;
          done();
        });
      }
    });
    it('should be able to fetch a file from the app directory', function (done) {
      var args = {path: path.resolve('/testapp.app', fileName)};
      driver
        .execute('mobile: pullFile', [args]).then(function (data) {
          var stringData = new Buffer(data, 'base64').toString();
          return stringData.should.equal(fileContent);
        })
      .nodeify(done);
    });
  });
});
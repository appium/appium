"use strict";

var initSession = require('../../helpers/session').initSession
  , getTitle = require('../../helpers/title').getTitle
  , _ = require('underscore')
  , getAppPath = require('../../helpers/app').getAppPath
  , tempDir = require('appium-support').tempDir
  , ncp = require('ncp');

require('../../helpers/setup-chai.js');

module.exports.spacesTest = function (desired) {
  var session;
  var title = getTitle(this);
  var oldAppPath = getAppPath('ApiDemos');
  var newAppPath = '/tmp/App With Spaces.apk';
  before(function (done) {
    tempDir.open({prefix: 'app with spaces', suffix: '.apk'}).nodeify(function (err, info) {
      if (err) return done(err);
      console.log("Copying '" + oldAppPath + "' to '" + info.path + "'");
      ncp(oldAppPath, info.path, function (err) {
        if (err) return done(err);
        newAppPath = info.path;
        done();
      });
    });
  });

  after(function (done) { session.tearDown(this.currentTest.state === 'passed').nodeify(done); });

  it('should work with spaces in app path', function (done) {
    session = initSession(_.defaults({'app': newAppPath}, desired));
    return session.setUp(title)
      .should.eventually.be.fulfilled
    .nodeify(done);
  });
};

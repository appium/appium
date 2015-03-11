"use strict";

var _ = require('underscore'),
    initSession = require('../../../helpers/session').initSession,
    should = require('chai').should(),
    expect = require('chai').expect,
    XCODE = require('../../../../lib/devices/ios/xcode.js'),
    fs = require('fs'),
    env = process.env,
    desired = require('./desired');

require('../../../helpers/setup-chai.js');

describe('testapp - device', function () {

  describe('xcode#getpath', function () {
    it('should always return a valid path', function (done) {
      this.timeout(5000);
      // getPath failures have been intermittent, so try a few times
      var iterations = 100;
      var nextTest = function () {
        XCODE.getPath(function (err, path) {
          expect(err).to.be.null;
          expect(path).not.to.be.empty;
          expect(fs.existsSync(path)).to.be.true;
          if (--iterations > 0) {
            nextTest();
          } else {
            done();
          }
        });
      };
      nextTest();
    });

    // careful, there's a bug in mocha so if you call this before
    // 'should always return a valid path', then the other test
    // will get passed this test's `err` object.
    it('should fail with a bad path', function (done) {
      env.DEVELOPER_DIR = "/foo/bar";

      XCODE.getPath(function (err) {
        env.DEVELOPER_DIR = "";
        expect(err).not.to.be.null;
        done();
      });
    });
  });

  describe('invalid deviceName @skip-ios6', function () {
    var newDesired = _.extend(_.clone(desired), {deviceName: "iFailure 3.5-inch"});
    var session = initSession(newDesired, {'no-retry': true});

    it('should fail gracefully with an invalid deviceName', function (done) {
      session.setUp()
        .should.eventually.be.rejectedWith(/environment you requested was unavailable/)
        .nodeify(done);
    });
  });

  _.each(['iPhone', 'iPad'], function (device) {
    describe('generic ' + device + ' deviceName @skip-ios6', function () {
      var newDesired = _.extend(_.clone(desired), {
        deviceName: device + " Simulator"
      });
      var session = initSession(newDesired, {'no-retry': true});

      after(function (done) {
        session.tearDown(this.currentTest.state === 'passed').nodeify(done);
      });

      it('should work with a generic ' + device + ' deviceName', function (done) {
        session.setUp()
          .nodeify(done);
      });
    });

  });

  describe("real device", function () {
    var newDesired = _.extend(_.clone(desired), {
      deviceName: "BadSimulator",
      udid: "12341234123412341234"
    });
    var session = initSession(newDesired, {'no-retry': true});
    it("shouldn't try to validate against sims", function (done) {
      session.setUp()
        .nodeify(function (err) {
          should.exist(err);
          var data = JSON.parse(err.data);
          data.value.origValue.should.not.contain("BadSimulator");
          err.message.should.contain("requested was unavailable");
          done();
        });
    });
  });
});

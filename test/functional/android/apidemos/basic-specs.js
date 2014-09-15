"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require("./desired")
  , try3Times = require('../../../helpers/repeat').try3Times
  , initSession = require('../../../helpers/session').initSession
  , getTitle = require('../../../helpers/title').getTitle
  , path = require('path')
  , ADB = require("../../../../lib/devices/android/adb.js")
  , chai = require('chai')
  , should = chai.should()
  , spawn = require('child_process').spawn
  , appPathBase = require('../app-path-base.js')
  , _ = require('underscore')
  , ChaiAsserter = require('../../../helpers/asserter.js').ChaiAsserter
  , getAppPath = require('../../../helpers/app').getAppPath
  , androidReset = require('../../../helpers/reset').androidReset;

describe("apidemo - basic @skip-ci", function () {

  afterEach(function (done) {
    setTimeout(function () { done(); }, 2000); // cooldown
  });

  describe('short command timeout', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should die with short command timeout', function (done) {
      driver
        .setCommandTimeout(3000)
        .sleep(4000)
        .elementByName('Animation')
          .should.be.rejectedWith(/status: (13|6)/)
        .nodeify(done);
    });
  });

  describe('commands coming in', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should not die if commands come in', function (done) {
      var start;
      var find = function () {
        if ((Date.now() - start) < 5000) {
          return driver
            .elementByName('Animation').should.eventually.exist
            .then(find);
        }
      };
      driver
        .setCommandTimeout(7000)
        .then(function () { start = Date.now(); })
        .then(find)
        .sleep(10000)
        .elementByName('Animation').should.be.rejected
        .nodeify(done);
    });
  });

  describe('api', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should get device size', function (done) {
      driver.getWindowSize()
        .then(function (size) {
          size.width.should.be.above(0);
          size.height.should.be.above(0);
        }).nodeify(done);
    });

    it('should be able to get current activity', function (done) {
      driver
        .getCurrentActivity()
          .should.eventually.include("ApiDemos")
        .nodeify(done);
    });
    it('should be able to get logcat log type', function (done) {
      driver
        .logTypes()
          .should.eventually.include('logcat')
        .nodeify(done);
    });
    it('should be able to get logcat logs', function (done) {
      driver.log('logcat').then(function (logs) {
        logs.length.should.be.above(0);
        logs[0].message.should.not.include("\n");
        logs[0].level.should.equal("ALL");
        logs[0].timestamp.should.exist;
      }).nodeify(done);
    });

    it('should be able to install/remove app and detect its status', function (done) {
      driver
        .isAppInstalled('foo')
          .should.eventually.equal(false)
        .isAppInstalled('io.appium.android.apis')
          .should.eventually.equal(true)
        .removeApp('io.appium.android.apis')
        .isAppInstalled('io.appium.android.apis')
          .should.eventually.equal(false)
        .installApp(getAppPath('ApiDemos'))
        .isAppInstalled('io.appium.android.apis')
          .should.eventually.equal(true)
        .nodeify(done);
    });
    it("should background the app", function (done) {
      var before = new Date().getTime() / 1000;
      driver
        .backgroundApp(3)
        .then(function () {
          ((new Date().getTime() / 1000) - before).should.be.least(3);
          // should really not be checking this.
          //((new Date().getTime() / 1000) - before).should.be.below(5);
        })
        .getCurrentActivity()
          .should.eventually.include("ApiDemos")
        .nodeify(done);
    });
    it("should get app strings", function (done) {
      driver
        .getAppStrings()
        .then(function (strings) {
          _.size(strings).should.be.above(1);
          strings.activity_sample_code.should.eql("API Demos");
        })
        .nodeify(done);
    });
  });

  describe('at any time', function () {
    var driver;
    setup(this, desired)
      .then(function (d) { driver = d; });

    it('should open an activity in this application', function (done) {
      driver
        .startActivity({appPackage: "io.appium.android.apis", appActivity: ".accessibility.AccessibilityNodeProviderActivity"})
        .getCurrentActivity()
        .should.eventually.include("Node")
        .nodeify(done);
    });

    it('should open an activity in another application', function (done) {
      driver
        .startActivity({appPackage: "com.android.contacts", appActivity: ".ContactsListActivity"})
        .getCurrentActivity()
        .should.eventually.include("Contact")
        .nodeify(done);
    });
  });

  describe('with fastReset', function () {
    var driver;
    setup(this, desired)
     .then(function (d) { driver = d; });

    it('should still be able to reset', function (done) {
      driver
        .sleep(3000)
        .resetApp()
        .getWindowSize()
        .nodeify(done);
    });
  });

  describe('activity style: no period', function () {
    this.timeout(env.MOCHA_INIT_TIMEOUT);
    var session;
    var title = getTitle(this);
    after(function () { return session.tearDown(this.currentTest.state === 'passed'); });
    it('should still find activity', function (done) {
      session = initSession(_.defaults({appActivity: 'ApiDemos'}, desired));
      session.setUp(title).nodeify(done);
    });
  });

  describe('activity style: fully qualified', function () {
    this.timeout(env.MOCHA_INIT_TIMEOUT);
    var session;
    var title = getTitle(this);
    after(function () { return session.tearDown(this.currentTest.state === 'passed'); });
    it('should still find activity', function (done) {
      session = initSession(_.defaults({appActivity: 'io.appium.android.apis.ApiDemos'}, desired));
      session.setUp(title).nodeify(done);
    });
  });

  describe('error cases', function () {
    this.timeout(env.MOCHA_INIT_TIMEOUT);
    var opts = {'no-retry': true};

    describe('activity style: non-existent', function () {
      var session;
      var title = getTitle(this);
      after(function () { return session.tearDown(this.currentTest.state === 'passed'); });
      it('should throw an error', function (done) {
        session = initSession(_.defaults({appActivity: '.Blargimarg'}, desired), opts);
        try3Times(function () {
          return session.setUp(title)
            .catch(function (err) { throw err.data; })
            .should.be.rejectedWith(/Activity used to start app doesn't exist/);
        }).nodeify(done);
      });
    });

    describe('bad app path', function () {
      var session;
      var title = getTitle(this);
      after(function () { return session.tearDown(this.currentTest.state === 'passed'); });
      it('should throw an error', function (done) {
        var badAppPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debugz.apk");
        session = initSession(_.defaults({'app': badAppPath}, desired), opts);
        try3Times(function () {
          return session.setUp(title)
            .catch(function (err) { throw err.data; })
            .should.eventually.be.rejectedWith(/Error locating the app/);
        }).nodeify(done);
      });
    });

    describe('app path with spaces', _.partial(appPathBase.spacesTest, desired));
  });

  describe('pre-existing uiautomator session', function () {
    this.timeout(env.MOCHA_INIT_TIMEOUT);
    before(function (done) {
      var adb = new ADB();
      var binPath = path.resolve(__dirname, "..", "..", "..", "..", "build",
          "android_bootstrap", "AppiumBootstrap.jar");
      var uiArgs = ["shell", "uiautomator", "runtest", "AppiumBootstrap.jar", "-c",
        "io.appium.android.bootstrap.Bootstrap"];
      adb.push(binPath, "/data/local/tmp/", function (err) {
        should.not.exist(err);
        spawn("adb", uiArgs);
        setTimeout(function () {
          adb.getPIDsByName("uiautomator", function (err, pids) {
            should.not.exist(err);
            pids.length.should.equal(1);
            done();
          });
        }, 5000);
      });
    });

    describe('launching new session', function () {
      var driver;
      setup(this, desired)
       .then(function (d) { driver = d; });

      it('should kill pre-existing uiautomator process', function (done) {
        driver.getWindowSize().should.eventually.exist
          .nodeify(done);
      });
    });

    describe('launching activity with custom intent parameter category', function () {
      var driver;
      var caps = _.clone(desired);
      caps.appActivity = "io.appium.android.apis.app.HelloWorld";
      caps.intentCategory = "appium.android.intent.category.SAMPLE_CODE";
      setup(this, caps)
       .then(function (d) { driver = d; });

      it('should launch activity with intent category', function (done) {
        driver.getCurrentActivity()
              .should.eventually.include("HelloWorld")
              .nodeify(done);
      });
    });

  });

  describe('appium android', function () {
    this.timeout(env.MOCHA_INIT_TIMEOUT);

    var session;
    var title = getTitle(this);

    if (env.FAST_TESTS) {
      beforeEach(function (done) {
        androidReset('io.appium.android.apis', '.ApiDemos').nodeify(done);
      });
    }

    afterEach(function () { return session.tearDown(this.currentTest.state === 'passed'); });

    it('should load an app with using absolute path', function (done) {
      var appPath = path.resolve(desired.app);
      session = initSession(_.defaults({'app': appPath}, desired));
      session.setUp(title + "- abs path").nodeify(done);
    });

    it('should load an app with using relative path', function (done) {
      var appPath = path.relative(process.cwd(), desired.app);
      session = initSession(_.defaults({'app': appPath}, desired));
      session.setUp(title + "- rel path").nodeify(done);
    });

    it('should load a zipped app via url', function (done) {
      var appUrl = 'http://appium.s3.amazonaws.com/ApiDemos-debug.apk';
      session = initSession(_.defaults({'app': appUrl}, desired));
      session.setUp(title + "- zip url").nodeify(done);
    });

    it('should load an app via package', function (done) {
      var caps = _.clone(desired);
      caps.app = 'io.appium.android.apis';
      caps.appActivity = '.ApiDemos';
      session = initSession(caps, desired);
      session.setUp(title + "- package").nodeify(done);
    });

  });

  describe('appium android', function () {
    this.timeout(env.MOCHA_INIT_TIMEOUT);

    var session;
    var title = getTitle(this);

    beforeEach(function (done) {
      var adb = new ADB({});
      adb.uninstallApk("io.appium.android.apis", done);
    });

    afterEach(function () { return session.tearDown(this.currentTest.state === 'passed'); });

    it('should be able to start session without launching app', function (done) {
      var appPath = path.resolve(desired.app);
      var caps = _.defaults({'app': appPath, 'autoLaunch': false}, desired);
      session = initSession(caps, desired);
      var driver = session.setUp(title + "- autoLaunch");
      var activityToBeBlank = new ChaiAsserter(function (driver) {
        return driver
          .getCurrentActivity()
          .should.eventually.not.include(".ApiDemos");
      });
      driver
        .waitFor(activityToBeBlank, 10000, 700)
        .launchApp()
        .getCurrentActivity()
          .should.eventually.include(".ApiDemos")
        .nodeify(done);
    });

    it('should be able to start session without installing app', function (done) {
      var appPath = path.resolve(desired.app);
      var appPkg = "io.appium.android.apis";
      var caps = _.defaults({
        app: appPkg,
        autoLaunch: false,
        appActivity: ".ApiDemos"
      }, desired);
      session = initSession(caps, desired);
      var driver = session.setUp(title + "- autoLaunch");
      var activityToBeBlank = new ChaiAsserter(function (driver) {
        return driver
          .getCurrentActivity()
          .should.eventually.not.include(".ApiDemos");
      });
      driver
        .waitFor(activityToBeBlank, 10000, 700)
        .installApp(appPath)
        .launchApp()
        .getCurrentActivity()
          .should.eventually.include(".ApiDemos")
        .nodeify(done);
    });

  });

});

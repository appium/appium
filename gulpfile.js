"use strict";

var argv = require('yargs').argv;

var gulp = require('gulp'),
    path = require('path'),
    mochaStream = require('spawn-mocha-parallel').mochaStream,
    jshint = require('gulp-jshint'),
    jshintStylish = require('jshint-stylish'),
    jscs = require('gulp-jscs'),
    Q = require('q'),
    runSequence = Q.denodeify(require('run-sequence')),
    cp = require('child_process'),
    spawn = cp.spawn,
    exec = Q.denodeify(cp.exec),
    stream = require('stream'),
    fs = require('fs'),
    split = require('split'),
    os = require('os'),
    _ = require('underscore'),
    through = require('through'),
    promisePipe = require("promisepipe"),
    assert = require('assert'),
    splitArray = require('./test/helpers/split-array');

var childProcs = [];

function newMochaOpts() {
  return {
    flags: {
      u: 'bdd-with-opts',
      R: process.env.MOCHA_REPORTER || 'nyan',
      'c': true
    },
    env: _.clone(process.env),
    bin: path.join(__dirname,  'node_modules/.bin/mocha'),
    concurrency: 5
  };
}

var JS_SOURCES = ['*.js', 'bin/**/*.js', 'ci/**/*.js', 'new-ci/**/*.js', 'lib/**/*.js', 'test/**/*.js'];

gulp.task('jshint', function () {
  return gulp.src(JS_SOURCES)
    .pipe(jshint())
    .pipe(jshint.reporter(jshintStylish))
    .pipe(jshint.reporter('fail'));
});

gulp.task('jscs', function () {
  return gulp.src(JS_SOURCES)
    .pipe(jscs({configPath: __dirname + '/.jscsrc'}));
});

gulp.task('lint', ['jshint', 'jscs']);

gulp.task('test-unit', function () {
  var opts = newMochaOpts();
  var mocha = mochaStream(opts);
  return gulp.src('test/unit/**/*-specs.js', {read: false})
    .pipe(mocha)
    .on('error',  console.warn.bind(console));
});

function splitE2ETests(srcGlobPattern) {
  var testFiles = [];
  var groups = {};
  return promisePipe(
    gulp.src(srcGlobPattern , {read: false})
      .pipe(through(function (file) {
        testFiles.push(path.relative(file.cwd ,file.path));
      })).on('close', function () {
        testFiles.sort();
        groups = splitArray(testFiles, argv.testSplit);
      })).then(function () {
        assert(groups.length === argv.testSplit);
        return groups;
      });
}

function splitAndroidE2ETests() {
  return splitE2ETests([
    'test/functional/common/**/*-specs.js',
    'test/functional/android/**/*-specs.js',
    '!test/functional/android/chrome/**'
  ]);
}

function splitIosE2ETests() {
  return splitE2ETests([
    'test/functional/common/**/*-specs.js',
    'test/functional/ios/**/*-specs.js'
  ]);
}

function killProcs() {
  return exec("sudo pkill -f 'sudo -u appium node'").catch(function () {}).then(function () { // killing launchctl appium processes
    _(childProcs).each(function (child) {
      try { child.kill(); } catch (err) {}
    });
  });
}

function showSplit(splitPromise, prefix) {
  return splitPromise
    .then(function (groups) {
      console.log(prefix + ' groups:');
      _(groups).each(function (group, i) {
        console.log(i + 1, '-->', group);
      });
    });
}

gulp.task('show-android-e2e-tests-split', function () {
  return showSplit(splitAndroidE2ETests(), 'Android');
});

gulp.task('show-ios-e2e-tests-split', function () {
  return showSplit(splitIosE2ETests(), 'iOS');
});

function newMochaE2EOpts() {
    var opts = newMochaOpts();
    opts.concurrency = 1;
    opts.liveOutput = true;
    opts.liveOutputPrepend= 'client -> ';
    opts.fileOutput = 'client.log';
    return opts;
}

gulp.task('test-android-e2e', function () {
  return splitAndroidE2ETests().then(function (testGroups) {
    var opts = newMochaE2EOpts();
    opts.env.DEVICE='android';
    opts.env.VERBOSE=1;
    opts.flags.g = '@skip-android-all|@android-arm-only|@skip-ci';
    opts.flags.i = true;
    var mocha = mochaStream(opts);
    var testGroup = testGroups[argv.testGroup - 1];
    console.log('running tests for:' + testGroup);
    return promisePipe(gulp.src(testGroup, {read: false})
      .pipe(mocha)
    ).fin(function () {
      return killProcs();
    });
  });
});

gulp.task('test-ios-e2e', function () {
  return splitIosE2ETests().then(function (testGroups) {
    var opts = newMochaE2EOpts();
    opts.env.DEVICE='ios92'; // TODO: make that configurable
    opts.env.VERBOSE=1;
    opts.flags.g = '@skip-ios92|@skip-ios9|@skip-ios-all|@skip-ios7up|@skip-ci';
    opts.flags.i = true;
    var mocha = mochaStream(opts);
    var testGroup = testGroups[argv.testGroup - 1];
    console.log('running tests for:' + testGroup);
    return promisePipe(gulp.src(testGroup, {read: false})
      .pipe(mocha)
    ).fin(function () {
      return killProcs();
    });
  });
});

function launchAppium(opts) {
  opts = opts || {};
  var deferred = Q.defer();
  var out = new stream.PassThrough();

  out.pipe(split())
    .on('data', function (line) {
      if (line.match(/Appium REST http interface listener started/)) {
         deferred.resolve();
      }
      console.log('server -->', line);
    });
  out.pipe(fs.createWriteStream('appium.log'));
  (function () {
    if (opts.asCurrentUser) {
      console.log('Running appium as current user.');
      // todo detect system
      //var yosemiteAsUser = function () {
        //var currentUser;
        //return exec('whoami').spread(function (stdout) {
            //currentUser = stdout.trim();
            //console.log('currentUser ->', currentUser);
            //var cmd = "ps -axj | grep loginwindow | awk \"/^" + currentUser + " / {print \\$2;exit}\"";
            //return exec(cmd);
          //}).spread(function (stdout) {
            //var userPid = stdout.trim();
            //console.log('userPid ->', userPid);
            //return spawn("sudo", [ 'launchctl', 'bsexec', userPid,
              //'sudo', '-u', currentUser  ,'node', '.'], { detached: false });
          //});
      //};
      var elCapitanAsUser = function () {
        var currentUser;
        return exec('whoami').spread(function (stdout) {
            currentUser = stdout.trim();
            console.log('currentUser ->', currentUser);
            var cmd = "id -u " + currentUser;
            return exec(cmd);
          }).spread(function (stdout) {
            var userId = stdout.trim();
            console.log('userUd ->', userId);
            return spawn("sudo", [ 'launchctl', 'asuser', userId,
              'sudo', '-u', currentUser  ,'node', '.'], { detached: false });
          });
      };
      var asCurrentUser = elCapitanAsUser;
      return asCurrentUser();

    } else {
      return new Q(spawn("node", ['.'], { detached: false }));
    }
  })().then(function (child) {
    childProcs.push(child);
    child.stdout.pipe(out);
    child.stderr.pipe(out);
    child.on('close', function () {
      deferred.reject('Something went wrong!');
    });
  }).done();
  return deferred.promise;
}

gulp.task('launch-appium', function () {
  launchAppium();
});

gulp.task('launch-appium-as-current-user', function () {
  launchAppium({asCurrentUser: true});
});

gulp.task('launch-emu', function () {
  var LOG_PREPEND= 'emu --> ';
  var deferred = Q.defer();

  var emuErrored = false;
  function waitForEmu() {
    var INIT_WAIT = 15000;
    var MAX_WAIT_MS = 300000;
    var POOL_MS = 5000;
    var startMs = Date.now();
    function _waitForEmu () {
      function retry() {
        if (emuErrored) {
          throw new Error('Emulator errored');
        }
        if (Date.now() - startMs > MAX_WAIT_MS) {
          throw new Error('Emulator did not show up');
        }
        console.log(LOG_PREPEND + 'Waiting for emu...');
        return Q.delay(POOL_MS).then(_waitForEmu);
      }
      return exec('adb shell getprop sys.boot_completed')
        .spread(function (stdout) {
          if (stdout && stdout.trim() === '1') {
            console.log(LOG_PREPEND + 'emulator started');
            return;
          }
          return retry();
        }, function (err) {
          if (err.toString().match(/device not found/)) {
            console.log(LOG_PREPEND + 'Device not found, it should be there, killing adb server.');
            return exec('adb kill-server').then(retry);
          }
          return retry();
        });
    }
    return Q.delay(INIT_WAIT).then(_waitForEmu)
      .then(function () {deferred.resolve();});
  }

  var out = new stream.PassThrough();
  out.pipe(split())
    .on('data', function (line) {
      console.log(LOG_PREPEND + line);
    });
  out.pipe(fs.createWriteStream('emulator.log'));
  var emuBin = os.platform() === 'linux' ? 'emulator64-x86' : 'emulator';
  var emuArgs = [
    '-avd', argv.avd,
    '-no-snapshot-load', '-no-snapshot-save',
    '-no-audio', '-netfast'
  ];
  if (os.platform() === 'linux') {
    emuArgs = emuArgs.concat([
      '-qemu', '-m', '512', '-enable-kvm'
    ]);
  }
  console.log(LOG_PREPEND + 'executing', emuBin, emuArgs.join(' '));
  var child = spawn(emuBin, emuArgs);
  childProcs.push(child);
  child.stdout.pipe(out);
  child.stderr.pipe(out);
  child.on('error', function (err) {
    emuErrored = true;
    deferred.reject(err);
  });
  child.on('close', function () {
    deferred.reject('Something went wrong!');
  });
  return Q.all([
    waitForEmu(),
    deferred.promise
  ]);
});

gulp.task('run-android-e2e', function () {
  return runSequence(['launch-emu', 'launch-appium'], 'test-android-e2e')
    .catch(function (err) {
      killProcs();
      throw err;
    });
});

gulp.task('run-ios-e2e', function () {
  return runSequence('launch-appium-as-current-user', 'test-ios-e2e')
    .catch(function (err) {
      killProcs();
      throw err;
    });
});

gulp.task('default', function () {
  return runSequence('lint', 'test-unit');
});

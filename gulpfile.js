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

function splitAndroidE2ETests() {
  var testFiles = [];
  var androidGroups = {};
  return promisePipe(
    gulp.src(['test/functional/common/**/*-specs.js', 'test/functional/android/**/*-specs.js',
              '!test/functional/android/chrome/**'], {read: false})
      .pipe(through(function (file) {
        testFiles.push(path.relative(file.cwd ,file.path));
      })).on('close', function () {
        testFiles.sort();
        androidGroups = splitArray(testFiles, argv.androidTestSplit);
      })).then(function () {
        assert(androidGroups.length === argv.androidTestSplit);
        return androidGroups;
      });
}

function killProcs() {
  _(childProcs).each(function (child) {
    try { child.kill(); } catch (err) {}
  });
}

gulp.task('kill-procs', function () {
  killProcs();
});

gulp.task('show-android-e2e-tests-split', function () {
  return splitAndroidE2ETests()
    .then(function (androidGroups) {
      console.log('Android groups:');
      _(androidGroups).each(function (group, i) {
        console.log(i + 1, '-->', group);
      });
    });
});

gulp.task('test-android-e2e', function () {
  return splitAndroidE2ETests().then(function (androidGroups) {
    var opts = newMochaOpts();
    opts.env.DEVICE='android';
    opts.env.VERBOSE=1;
    opts.flags.g = '@skip-android-all|@android-arm-only|@skip-ci';
    opts.flags.i = true;
    opts.concurrency = 1;
    opts.liveOutput = true;
    opts.liveOutputPrepend= 'client -> ';
    opts.fileOutput = 'client.log';
    var mocha = mochaStream(opts);
    var androidGroup = androidGroups[argv.androidTestGroup - 1];
    console.log('running tests for:' + androidGroup);
    return promisePipe( gulp.src(androidGroup, {read: false})
      .pipe(mocha)
      .on('error',  function (err) {
        killProcs();
        throw err;
      })
    );
  });
});

gulp.task('launch-appium', function () {
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
  var child = spawn("node", ['.'], { detached: false });
  childProcs.push(child);
  child.stdout.pipe(out);
  child.stderr.pipe(out);
  child.on('close', function () {
    deferred.reject('Something went wrong!');
  });
  return deferred.promise;
});

gulp.task('launch-emu', function () {
  var LOG_PREPEND= 'emu --> ';
  var deferred = Q.defer();

  var emuErrored = false;
  function waitForEmu() {
    var INIT_WAIT = 5000;
    var MAX_WAIT_MS = 120000;
    var POOL_MS = 2000;
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
  return runSequence(['launch-emu', 'launch-appium'], 'test-android-e2e', 'kill-procs')
    .catch(function (err) {
      killProcs();
      throw err;
    });
});

gulp.task('default', function () {
  return runSequence('lint', 'test-unit');
});

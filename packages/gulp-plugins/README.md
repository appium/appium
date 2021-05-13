appium-gulp-plugins
===================

Custom plugins used across appium modules

## status

[![Build Status](https://travis-ci.org/appium/appium-gulp-plugins.svg?branch=master)](https://travis-ci.org/appium/appium-gulp-plugins)

## boilerplate plugin

This plugin sets up all the other typical plugins we use with a simple
configuration object.

### usage

Basically just set up the `boilerplate` plugin as follows:

```js
let gulp = require('gulp'),
    boilerplate = require('appium-gulp-plugins').boilerplate.use(gulp);

boilerplate({build: "My Project Name"});
```

You can pass a lot of options to configure `boilerplate`. Here are the options
along with their defaults (from `lib/boilerplate.js`):

```js
const DEFAULT_OPTS = {
  files: ['*.js', 'lib/**/*.js', 'test/**/*.js', '!gulpfile.js'],
  transpile: true,
  transpileOut: 'build',
  babelOpts: {},
  linkBabelRuntime: true,
  watch: true,
  watchE2E: false,
  test: {
    files: ['${testDir}/**/*-specs.js', '!${testDir}/**/*-e2e-specs.js'],
    traceWarnings: false,
  },
  coverage: {
    files: ['./build/test/**/*-specs.js', '!./build/test/**/*-e2e-specs.js'],
    verbose: true,
  },
  'coverage-e2e': {
    files: ['./build/test/**/*-e2e-specs.js'],
    verbose: true,
  },
  e2eTest: {
    files: ['${testDir}/**/*-e2e-specs.js'],
    forceExit: false,
    traceWarnings: false,
  },
  testReporter: (process.env.TRAVIS || process.env.CI) ? 'spec' : 'nyan',
  testTimeout: 20000,
  build: 'Appium',
  extraPrepublishTasks: [],
  eslint: true,
  eslintOnWatch: false, // deprecated, move to lintOnWatch
  lintOnWatch: false,
  ci: {
    interval: 60000,
    owner: 'appium',
    repo: 'appium-build-store',
  },
};
```

As you can see, it defaults to transpiling with Babel, running `eslint`
running tests, and with the default task being `gulp watch`.

## transpile plugin

Babel compilation, sourcemaps and file renaming functionality in
one plugin. `.es7.js` and `.es6.js` files will be automatically renamed to `.js
files`. The necessary sourcemaps, comments and imports are also
automatically added.

### usage

1/ Configure gulp as below:

``` js
let gulp = require('gulp'),
Transpiler = require('appium-gulp-plugins').Transpiler;

gulp.task('transpile', function () {
  let transpiler = new Transpiler();
  // babel options are configurable in transpiler.babelOpts

  return gulp.src('test/fixtures/es7/**/*.js')
    .pipe(transpiler.stream())
    .pipe(gulp.dest('build'));
});
```

2/ in your code you need to mark the main and mocha files as below:

- main: add `// transpile:main` at the beginning of the file ([example here](https://github.com/appium/appium-gulp-plugins/blob/master/test/fixtures/es7/lib/run.es7.js)) .
- mocha: add `// transpile:mocha` at the beginning of the file ([example here](https://github.com/appium/appium-gulp-plugins/blob/master/test/fixtures/es7/test/a-specs.es7.js))

Regular lib files do not need any extra comments.

## watch plugin

There are some issues with Gulp 3.x error handling which cause the default
gulp-watch to hang. This plugin is a small hack which solves that by respawning
the whole process on error. This should not be needed in gulp 4.0.

Files in the `/test` directory that are named `.*-specs.js` are run. Tests which end in `.*-e2e-specs.js` are *not* run when watching. To run end-to-end tests, run `gulp e2e-test`.

### usage

```js
const gulp = require('gulp');
const spawnWatcher = require('./index').spawnWatcher.use(gulp, opts);

spawnWatcher.configure('watch', ['lib/**/*.js','test/**/*.js','!test/fixtures'], function () {
  // this is the watch action
  return runSequence('test');
});
```

The test function in `spawnWatcher.configure` should return a promise.

### error handling

The spawn needs to catch error as soon as they happen. To do so use the
`spawnWatcher.handleError` method, for instance:

```js
// add error handling where needed
gulp.task('transpile', function () {
  return gulp.src('test/es7/**/*.js')
    .pipe(transpile())
    .on('error', spawnWatcher.handleError)
    .pipe(gulp.dest('build'));
});

gulp.task('test', ['transpile'] , function () {
  return gulp.src('build/test/a-specs.js')
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});
```

### notification

Native notification is enabled by default. To disable it use the
`--no-notif` option.

### collate logging and tests
Set the environment variable `_FORCE_LOGS`

## iOS app building

This package can create `gulp` tasks for building and cleaning iOS apps. By
providing an `iosApps` property in the options sent to `boilerplate()` with the
following:
```js
iosApps: {
  relativeLocations: {
    iphoneos: 'relative/path/to/device/app.app',
    iphonesimulator: 'relative/path/to/sim/app.app',
  },
  appName: 'AppName.app',
},
```
This will create a number of `gulp` tasks, centrally one named
`ios-apps:install`, which will go through the process of cleaning the build,
building, and putting the products into deterministic places.

The simulator app will be build in `build/Release-iphonesimulator/<appName>`,
and the real device app will be in `build/Release-iphoneos/<appName>`.

To build for real devices, set the environment variable `IOS_REAL_DEVICE` or
`REAL_DEVICE`. To specify an `xcconfig` file, set its location in the
`XCCONFIG_FILE` environment variable.


## hacking this package

###

Since this package is used to build and test all the Appium packages, it should
not _use_ any of those packages.

### watch

```
npm run watch
```

### test

```
npm test
```

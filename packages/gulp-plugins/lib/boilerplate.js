'use strict';

const _ = require('lodash');
const tasks = require('./tasks/');
const log = require('fancy-log');


if (process.env.TRAVIS || process.env.CI) {
  process.env.REAL_DEVICE = 0;
}

const DEFAULT_OPTS = {
  files: ['lib/**/*.js', 'test/**/*.js', '!gulpfile.js'],
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
  eslint: false, // deprecated, use eslint
  eslintOnWatch: false, // deprecated, move to lintOnWatch
  lintOnWatch: false, // deprecated
  ci: {
    interval: 60000,
    owner: 'appium',
    repo: 'appium-build-store',
  },
  yamllint: true,
  yaml: {
    files: ['**/.*.yml', '**/*.yml', '**/.*.yaml', '**/*.yaml', '!test/**', '!node_modules/**', '!**/node_modules/**'],
    safe: false,
  },
};

const boilerplate = function (gulp, opts) {
  opts = _.merge({}, DEFAULT_OPTS, opts);

  if (!_.isEmpty(opts.buildName)) {
    log.warn(`The 'buildName' option is deprecated. Use 'build' instead`);
    opts.build = opts.buildName = opts.build || opts.buildName;
  }

  const spawnWatcher = require('./spawn-watcher').use(gulp, opts);
  const rootDir = opts.transpile ? opts.transpileOut : '.';
  const fileAliases = {
    rootDir,
    testDir: `${rootDir}/test`,
    libDir: `${rootDir}/lib`,
  };

  // configure the individual tasks
  tasks.configure(gulp, opts, {
    fileAliases,
    spawnWatcher,
  });

  // conpute and define the default sequence of tasks
  let defaultSequence = [];
  if (opts.transpile) {
    defaultSequence.push('clean');
  }
  if (opts.eslint || opts.lint) {
    log.warn('Use eslint proper instead of gulp; no linting will be performed via eslint');
  }
  if (opts.transpile && !opts.test) {
    defaultSequence.push('transpile');
  }
  if (opts.test) {
    if (opts.watchE2E) {
      defaultSequence.push('test');
    } else {
      defaultSequence.push('unit-test');
    }
  }
  if (opts.extraDefaultTasks) {
    defaultSequence.push(...opts.extraDefaultTasks);
  }

  if (opts.watch) {
    if (opts.eslintOnWatch) {
      log.warn(`The 'eslintOnWatch' option is deprecated. Use 'lintOnWatch' instead`);
      opts.lintOnWatch = true;
    }
    if (opts.lintOnWatch && !opts.eslint) {
      log.warn('Use eslint proper instead of gulp; no linting will be performed via eslint');
    }
    const watchSequence = opts.lintOnWatch
      ? defaultSequence
      : defaultSequence.filter(function filterLintTasks (step) {
        return step !== 'lint';
      });
    spawnWatcher.configure('watch', opts.files, watchSequence);
  }

  spawnWatcher.configure('dev', opts.files, ['transpile']);
  gulp.task('once', gulp.series(...defaultSequence));
  gulp.task('default', gulp.series(opts.watch ? 'watch' : 'once'));
};


module.exports = {
  DEFAULTS: _.cloneDeep(DEFAULT_OPTS),
  use (gulp) {
    return function callBoilerplate (opts) {
      boilerplate(gulp, opts);
    };
  }
};

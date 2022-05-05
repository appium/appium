'use strict';

const gulp = require('gulp');
const {Transpiler, spawnWatcher, isVerbose} = require('../..');
const _ = require('lodash');
const B = require('bluebird');
const {exec} = require('../../lib/utils');
const assert = require('assert');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const globby = require('globby');
const rimraf = B.promisify(require('rimraf'));

spawnWatcher.use(gulp);

gulp.task('generate-lots-of-files', async function () {
  await rimraf('test/generated/es7 build/generated');
  await exec('mkdir', ['-p', 'test/generated/es7']);
  await B.all([
    ..._.times(24).map(function (i) {
      return exec('cp', [
        'test/fixtures/es7/lib/a.es7.js',
        `test/generated/es7/a${i + 1}.es7.js`,
      ]);
    }),
  ]);
});

gulp.task('transpile-lots-of-es7-files', function () {
  const transpiler = new Transpiler();
  return gulp
    .src('test/generated/es7/**/*.js')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(transpiler.stream())
    .on('error', spawnWatcher.handleError)
    .pipe(gulp.dest('build/generated'));
});

gulp.task(
  'transpile-lots-of-files',
  gulp.series('generate-lots-of-files', 'transpile-lots-of-es7-files')
);

gulp.task(
  'test-transpile-lots-of-es7-files',
  async function testTranspileLotsOfFiles() {
    let files = await globby('test/generated/es7/**/*.js');
    const numOfFiles = files.length;
    assert(numOfFiles > 16);

    files = await globby('build/generated/a*.js');
    assert(files.length === numOfFiles);

    files = await globby('build/generated/*.es7.js');
    assert(files.length === 0);
  }
);

gulp.task(
  'test-transpile-lots-of-files',
  gulp.series('transpile-lots-of-files', 'test-transpile-lots-of-es7-files')
);

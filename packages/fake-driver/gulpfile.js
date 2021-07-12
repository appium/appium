'use strict';

const gulp = require('gulp');
const boilerplate = require('@appium/gulp-plugins').boilerplate.use(gulp);

gulp.task('copy-screen.png', () => gulp.src('./screen.png').pipe(gulp.dest('./build/')));

gulp.task('copy-app.xml', () => gulp.src('./test/fixtures/app.xml').pipe(gulp.dest('./build/test/fixtures/')));

boilerplate({
  build: '@appium/fake-driver',
  testTimeout: 15000,
  watchE2E: true,
  postTranspile: ['copy-screen.png', 'copy-app.xml']
});

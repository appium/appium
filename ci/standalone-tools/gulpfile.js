// Here are some utilities used by the jobs which do not need to download
// the whole appium repo

"use strict";

var gulp = require('gulp'),
    _ = require('underscore'),
    Q = require('q'),
    exec = Q.denodeify(require('child_process').exec);

gulp.task('hello-world', function () {
  console.log('Hello World!');
});

gulp.task('collect-downstream-tap-results', function () {
  var ciRootUrl = process.env.HUDSON_URL;
  var jobNameRaw = process.env.LAST_TRIGGERED_JOB_NAME;
  var jobName = jobNameRaw.replace(/_/g,' ');
  var builds = process.env['TRIGGERED_BUILD_NUMBERS_' + jobNameRaw].split(',');
  var seq = _(builds).map(function (build) {
    return function () {
      var tapTgz = 'tapdata_' + build + '.tgz';
      var url = ciRootUrl + 'job/' + jobName.replace(/\s/g, '%20') + '/' + build + '/s3/download/' + tapTgz;
      console.log('Retrieving url -->', url);
      return exec('wget ' + url).then(function () {
        return exec('tar xfz ' + tapTgz);
      });
    };
  });
  return seq.reduce(Q.when, new Q());
});

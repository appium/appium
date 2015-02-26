// Here are some utilities used by the jobs which do not need to download
// the whole appium repo

"use strict";

var gulp = require('gulp'),
    _ = require('underscore'),
    Q = require('q'),
    exec = Q.denodeify(require('child_process').exec),
    argv = require('yargs').argv,
    request = Q.denodeify(require('request'));

gulp.task('hello-world', function () {
  console.log('Hello World!');
});

function encode(s) {
  return s.replace(/\s/g, '%20');
}

function downloadS3Artifact(jobName, buildNumber, artifact) {
  var ciRootUrl = process.env.HUDSON_URL;
  var url = ciRootUrl + 'job/' + encode(jobName) + '/' + buildNumber + '/s3/download/' + artifact;
  console.log('Retrieving url -->', url);
  return exec('wget ' + url);
}

gulp.task('collect-downstream-tap-results', function () {
  var jobNameRaw = process.env.LAST_TRIGGERED_JOB_NAME;
  var jobName = jobNameRaw.replace(/_/g,' ');
  var builds = process.env['TRIGGERED_BUILD_NUMBERS_' + jobNameRaw].split(',');
  var ok = true;
  var seq = _(builds).map(function (build) {
    return function () {
      var tapTgz = 'tapdata_' + build + '.tgz';
      return downloadS3Artifact(jobName, build, tapTgz).then(function () {
        return exec('tar xfz ' + tapTgz);
      }).catch(function (err) {
        console.error('error while retrieving ' + tapTgz + 'error: ' + err);
        ok = false;
      });
    };
  });
  return seq.reduce(Q.when, new Q())
    .then(function () {
      if (!ok) throw new Error('Tap file retrieval failed.');
    });
});

gulp.task('download-build', function () {
  var upstreamJobName = argv.upstreamBuildName;
  var upstreamBuildNumber = argv.upStreamBuildNumber;
  var ciRootUrl = process.env.HUDSON_URL;

  console.log('upstreamJobName ->', upstreamJobName);
  console.log('upstreamBuildNumber ->', upstreamBuildNumber);

  var upStreamJobUrl = ciRootUrl + 'job/' + encode(upstreamJobName) +
     '/' + upstreamBuildNumber  + '/api/json';
  console.log('upStreamJobUrl ->', upStreamJobUrl);
  return request(upStreamJobUrl)
    .spread(function (res, body) {
      // extracting downstream build job information
      return _(JSON.parse(body).subBuilds).chain()
        .filter(function (build) {
          return build.jobName.match(/Build/);
        }).first().value();
    }).then(function (buildJob) {
      return downloadS3Artifact(buildJob.jobName, buildJob.buildNumber, 'appium-build.bz2');
    });
});


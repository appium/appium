#!/usr/bin/env node

'use strict';

var args = process.argv.slice(2),
    Saucelabs = require('saucelabs'),
    Q = require('q'),
    _ = require('underscore'),
    prompt = require('prompt');

var CONCURRENCY = 10;

var buildId = args[0];

if (!buildId) {
  console.log('\nUsage: ci/tools/kill-sauce-jobs <build_id>\n');
  console.log('\nExample: ci/tools/kill-sauce-jobs 4711\n');
  process.exit(1);
}

if (!process.env.SAUCE_ACCESS_KEY) {
  console.log('\nPlease set the SAUCE_USERNAME and SAUCE_ACCESS_KEY ' +
    'env variables!\n');
  process.exit(1);
}

var account = new Saucelabs({
  username: process.env.SAUCE_USERNAME || 'appium',
  password: process.env.SAUCE_ACCESS_KEY
});

var getJobs = Q.nbind(account.getJobs, account);
var stopJob = Q.nbind(account.stopJob, account);

var selectedJobs;

getJobs()
  .then(function (jobs) {
    return _(jobs).filter(function (job) {
      return job.build === buildId &&
        ['in progress','queued'].indexOf(job.status) >= 0;
    }).map(function (job) {
      return _(job).pick('id', 'name', 'tags', 'build', 'status');
    });
  }).then(function (jobs) {
    selectedJobs = jobs;
    if (jobs.length > 0) {
      console.log("\nWill kill jobs:\n");
      console.log(jobs);
      console.log("\nNumber of jobs to kill:", jobs.length, "\n");
      console.log("\nKill all these jobs? (Y/N):\n");
      prompt.start();
      return Q.nfcall(prompt.get, {
        name: 'YesNo',
        validator: /^[ynYN]{1}$/m,
        warning: 'only (Y/N)',
        required: true
      });
    } else {
      console.log('No jobs to kill.');
      return false;
    }
  }).then(function (result) {
    if (result && result.YesNo.toLowerCase() === 'y') {
      console.log('\nStarting to kill jobs.\n');
      var tasks = selectedJobs.map(function (job) {
        return function () {
          console.log('Killing job:', job.id);
          return stopJob(job.id, {}).then(function () {
            console.log('Job', job.id, "was killed" );
          }, function (err) {
            console.warn('Could not kill', job.id, 'err:', err);
          });
        };
      });
      var process = function () {
        console.log('\n');
        if (tasks.length === 0) return new Q();
        var batch = [];
        while (tasks.length >0 && batch.length < CONCURRENCY) {
          batch.push(tasks.shift()());
        }
        return Q.all(batch).then(function () {
          return process();
        });
      };
      return process().then(function () {
        console.log('\nFinished to kill jobs.\n');
      });
    }
  }).done();


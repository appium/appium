#!/usr/bin/env node

// Note: In order to use this, you need to know the appium sauce api key.

'use strict';

var args = process.argv.slice(2),
    Saucelabs = require('saucelabs'),
    Q = require('q'),
    _ = require('underscore'),
    prompt = require('prompt');

var buildId = args[0];

if (!buildId) {
  console.log('\nUsage: green-build <build_id>\n');
  console.log('\nExample: green-build 4711\n');
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
var updateJob = Q.nbind(account.updateJob, account);

var selectedJobs;

getJobs()
  .then(function (jobs) {
    return _(jobs).filter(function (job) {
      return job.build === buildId && !job.passed;
    }).map(function (job) {
      return _(job).pick('id', 'name', 'tags', 'build', 'passed', 'error');
    });
  }).then(function (jobs) {
    selectedJobs = jobs;
    if (jobs.length > 0) {
      console.log("\nJobs needing greening:\n");
      console.log(jobs);
      console.log("\nMark all these jobs as passed? (Y/N):\n");
      prompt.start();
      return Q.nfcall(prompt.get, {
        name: 'YesNo',
        validator: /^[ynYN]{1}$/m,
        warning: 'only (Y/N)',
        required: true
      });
    } else {
      console.log('All jobs are already green.');
      return false;
    }
  }).then(function (result) {
    if (result && result.YesNo.toLowerCase() === 'y') {
      console.log('Starting to green jobs.');
      return Q.all(selectedJobs.map(function (job) {
        return updateJob(job.id, {passed: true});
      })).then(function () { console.log('Finished to green jobs.'); });
    }
  }).done();


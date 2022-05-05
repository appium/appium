#!/usr/bin/env node

const path = require('path');
const childProcess = require('child_process');
const _ = require('lodash');

const res = JSON.parse(
  childProcess.execSync('npm pack --dry-run --json --ignore-scripts', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  })
)[0];

// List of files we are testing to make sure they are included in package
const testFiles = [
  'LICENSE', // Check that license is included
  'build/lib/appium.js', // Sanity check that build files are being included by testing just one file
];

// Get list of files in `testFiles` that aren't in the list of packaged fileNames
const missingFiles = _.without(testFiles, ..._.map(res.files, 'path'));

if (!_.isEmpty(missingFiles)) {
  throw new Error(
    `Files [${missingFiles.join(
      ', '
    )}] are not included in package.json "files". ` +
      `Please make sure these files are included before publishing.`
  );
}

process.exit(0);

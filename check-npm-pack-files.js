const childProcess = require('child_process');
const _ = require('lodash');

const res = JSON.parse(childProcess.execSync('npm pack --dry-run --json --ignore-scripts', {encoding: 'utf8'}))[0];

const fileNamesMap = {};
for (const file of res.files) {
  fileNamesMap[file.path] = true;
}

const testFiles = [
  'npm-shrinkwrap.json', // Check that npm-shrinkwrap.json is being packed
  'LICENSE', // Check that license is included
  'build/lib/appium.js', // Sanity check that build files are being included by testing just one file
];

const missingFiles = [];
for (const testFile of testFiles) {
  if (!fileNamesMap[testFile]) {
    missingFiles.push(testFile);
  }
}

if (!_.isEmpty(missingFiles)) {
  throw new Error(`Files '${missingFiles.join(', ')}' are not included in package.json "files". Please make sure these files are included before publishing.`);
}

process.exit(0);

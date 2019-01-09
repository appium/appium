const childProcess = require('child_process');
const _ = require('lodash');

const res = JSON.parse(childProcess.execSync('npm pack --dry-run --json --ignore-scripts', {encoding: 'utf8'}))[0];

// Get list of the files being packed
const fileNames = [];
for (const file of res.files) {
  fileNames.push(file.path);
}

// Get list of files we want to test for existence
const testFiles = [
  'npm-shrinkwrap.json', // Check that npm-shrinkwrap.json is being packed
  'LICENSE', // Check that license is included
  'build/lib/appium.js', // Sanity check that build files are being included by testing just one file
];

// Get list of files in `testFiles` that aren't in the list of packaged fileNames
const missingFiles = _.without(testFiles, ...fileNames);

if (!_.isEmpty(missingFiles)) {
  throw new Error(`Files [${missingFiles.join(', ')}] are not included in package.json "files". ` +
    `Please make sure these files are included before publishing.`);
}

process.exit(0);

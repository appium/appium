'use strict';

const argv = require('yargs').argv;
const replace = require('replace-in-file');
const log = require('fancy-log');
const semver = require('semver');
const globby = require('globby');


function logFileChanges (changes = []) {
  // `changes` will have entries like
  //   { file: "app/build.gradle", hasChanged: true }
  changes = changes.filter((entry) => entry.hasChanged).map((entry) => entry.file);
  log(`Updated files: ${changes.join(', ')}`);
}

const configure = function configure (gulp) {
  gulp.task('gradle-version-update', async function gradleVersionUpdate () {
    const files = await globby(['app/build.gradle']);
    if (!files.length) {
      throw new Error('No app/build.gradle file found');
    }
    const gradleFile = files[0];

    const version = argv['package-version'];
    if (!version) {
      throw new Error('No package version argument (use `--package-version=xxx`)');
    }
    if (!semver.valid(version)) {
      throw new Error(`Invalid version specified '${version}'. Version should be in the form '1.2.3'`);
    }

    let changedFiles = await replace({
      files: gradleFile,
      from: /^\s*versionName\s+['"](.+)['"]$/gm,
      to: (match) => {
        log(`Updating gradle build file to version name '${version}'`);
        // match will be like `versionName '1.2.3'`
        return match.replace(/\d+\.\d+\.\d+/, version);
      },
    });
    logFileChanges(changedFiles);

    changedFiles = await replace({
      files: gradleFile,
      from: /^\s*versionCode\s+(.+)$/gm,
      to: (match) => {
        // match will be like `versionCode 42`
        const codeMatch = /\d+/.exec(match.trim());
        if (!codeMatch) {
          throw new Error('Unable to find existing version code');
        }
        const code = parseInt(codeMatch[0], 10) + 1;
        log(`Updating gradle build file to version code '${code}'`);
        return match.replace(/\d+/, code);
      },
    });
    logFileChanges(changedFiles);
  });
};

module.exports = {
  configure,
};

/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/prefer-await-to-callbacks */
const octokit = require('@octokit/rest')();
const gulp = require('gulp');
const _ = require('lodash');
const log = require('fancy-log');
const fs = require('fs');
const path = require('path');


const owner = 'appium';
const repo = 'appium-build-store';

const BUILD_NAME = process.env.TRAVIS_TAG || process.env.TRAVIS_COMMIT || `${Date.now()}`; // The random number is for local, throwaway tests
const COMMIT_MESSAGE = process.env.TRAVIS_COMMIT_MESSAGE || 'No commit message provided';

gulp.task('authenticate', function (done) {
  const githubToken = process.env.GITHUB_TOKEN;

  if (_.isEmpty(githubToken)) {
    log.warn('No GitHub token found in GITHUB_ACCESS_TOKEN environment variable');
    return;
  }

  octokit.authenticate({
    type: 'token',
    token: githubToken,
  });
  done();
});

gulp.task('upload', function () {
  const releaseTag = `appium-build-${BUILD_NAME}`;
  const releaseFile = `appium-${BUILD_NAME}.zip`;

  let releaseId;

  log(`Creating release on '${owner}/${repo}'`);
  return octokit.repos.createRelease({
    owner,
    repo,
    tag_name: releaseTag,
    name: `Appium build ${BUILD_NAME}`,
    body: `Appium build for commit ${BUILD_NAME}\n'${COMMIT_MESSAGE}'`,
  })
    .then(function (res) {
      releaseId = res.data.id;
      log(`Created release '${releaseTag}' (id: ${releaseId})`);
      return res.data.upload_url;
    })
    .then(function (url) {
      const file = path.resolve(__dirname, '..', 'appium.zip');
      log(`Uploading file '${file}'`);
      return octokit.repos.uploadReleaseAsset({
        headers: {
          'content-length': fs.statSync(file).size,
          'content-type': 'application/zip',
        },
        url,
        file: fs.createReadStream(file),
        name: releaseFile,
      });
    })
    .then(function (/* res */) {
      log(`Uploaded release file '${releaseFile}'`);
    })
    .catch(function (err) {
      log.error(`Error uploading release asset: ${err.message}`);
      if (err.errors) {
        log.error(JSON.stringify(err.errors, 2));
      }

      log('Deleting release with no asset');
      return octokit.repos.deleteRelease({
        owner,
        repo,
        release_id: releaseId,
      })
      .then(function (/* res */) {
        log('Release deleted');
      });
    });
});

gulp.task('github-upload', gulp.series(['authenticate', 'upload']));

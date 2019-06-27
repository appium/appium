const semver = require('semver');
const { version } = require('../../package.json');
const { prerelease } = semver(version);
const tag = prerelease.length > 0 ? prerelease[0] : 'latest';
console.log(tag); //eslint-disable-line no-console
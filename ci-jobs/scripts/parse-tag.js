const semver = require('semver');
const { version } = require('../../package.json');
console.log(semver(version).prerelease[0]); //eslint-disable-line no-console
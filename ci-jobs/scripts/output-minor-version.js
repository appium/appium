const semver = require('semver');

/**
 * Parses the package.json with what the next minor version should be
 * and saves it to env MINOR_VERSION
 *
 * e.g.) If the package.json has version 1.13.4 the next minor version
 * should be 1.14
 */
function outputNextMinorVersion () {
  const {version} = require('../../package.json');
  const major = semver.major(version);
  const minor = semver.minor(version);
  const minorVersionName = `${major}.${minor}`;
  // eslint-disable-next-line no-console
  console.log(minorVersionName);
}

outputNextMinorVersion();
const semver = require('semver');

if (!process.env.RELEASE_BRANCH) {
  throw new Error(`Must provide environment variable: $RELEASE_BRANCH`);
}

const APPIUM_VERSION = process.env.APPIUM_VERSION;
if (!APPIUM_VERSION) {
  throw new Error(`Must provide environment variable: $APPIUM_VERSION`);
} else if (APPIUM_VERSION.toLowerCase().startsWith('v')) {
  throw new Error(`Appium version must not start with letter 'v'`);
} else if (!semver.valid(APPIUM_VERSION)) {
  throw new Error(`Not a valid semantic version: ${APPIUM_VERSION}`);
} else {
  const { prerelease } = semver(APPIUM_VERSION);
  if (prerelease.length > 0) {
    if (!['beta', 'rc', 'fake'].includes(prerelease[0])) {
      throw new Error(`Not a valid version '${APPIUM_VERSION}. NPM tag must be one of beta, rc, or it must be ommitted if it's latest. Found '${prerelease[0]}'`);
    }
  }
}

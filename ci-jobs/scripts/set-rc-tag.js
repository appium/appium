const fs = require('fs');
const path = require('path');
const semver = require('semver');
const beautify = require('js-beautify').js;
const packageJson = require('../../package.json');

/**
 * Set release candidate tag on package.json
 */
function setRCTag () {
  const nonTaggedVersion = semver.valid(semver.coerce(packageJson.version));
  packageJson.version = `${nonTaggedVersion}-rc.0`;
  fs.writeFileSync(path.resolve('package.json'), beautify(JSON.stringify(packageJson)));
}

setRCTag();
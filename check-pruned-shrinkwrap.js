const _ = require('lodash');
const { asyncify } = require('asyncbox');
const { fs, logger } = require('appium-support');
const path = require('path');

const log = new logger.getLogger('ShrinkwrapValidator');

async function main () {
  const backupShrinkwrap = JSON.parse(await fs.readFile(path.resolve('npm-shrinkwrap-backup.json')));
  const shrinkwrap = JSON.parse(await fs.readFile(path.resolve('npm-shrinkwrap.json')));
  log.info('Checking that pruned shrinkwrap is a subset of primary shrinkwrap');
  if (!_.isMatch(backupShrinkwrap, shrinkwrap)) {
    log.errorAndThrow('Pruned shrinkwrap (shrinkwrap with dev dependencies removed) is not a subset of the original npm-shrinkwrap.json');
  }
  log.info('Shrinkwrap check passed');
}

if (require.main === module) {
  asyncify(main);
}
const path = require('path');
const {fs, logger} = require('appium-support');
const {asyncify} = require('asyncbox');
const packageJson = require('../../package.json');

const log = new logger.getLogger('Create Release Branch:');

async function setPackageJsonVersion(
  version = `${process.env.MINOR_BRANCH_NAME}.0-rc.0`
) {
  packageJson.version = version;
  log.info(`Setting version to: ${version}`);
  await fs.writeFile(
    path.resolve(__dirname, '..', '..', 'package.json'),
    JSON.stringify(packageJson, null, 2),
    'utf8'
  );
}

if (require.main === module) {
  asyncify(setPackageJsonVersion);
}

module.exports = setPackageJsonVersion;

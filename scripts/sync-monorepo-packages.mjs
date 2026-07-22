import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {fs, logger} from '@appium/support';

export const log = logger.getLogger('SYNC-MONOREPO-PACKAGES');

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const ROOT_PACKAGE_JSON = path.join(ROOT_DIR, 'package.json');
const ROOT_LICENSE = path.join(ROOT_DIR, 'LICENSE');
const ROOT_README = path.join(ROOT_DIR, 'README.md');
const APPIUM_PACKAGE_README = path.join(ROOT_PACKAGES_DIR, 'appium', 'README.md');

const COMMON_FIELDS_TO_COPY = ['author', 'license', 'bugs', 'homepage'];
const LOGGER_COMMON_FIELDS_TO_COPY = ['author', 'bugs', 'homepage'];

const KEYWORD_EXCLUDED_PACKAGES = new Set([
  'eslint-config-appium-ts',
  'oxc-config',
  'semantic-release-config',
  'types',
]);
// Package names in this set will not receive the LICENSE file from the root,
// as they have their own license terms (e.g., ISC for logger).
const LICENSE_EXCLUDED_PACKAGES = new Set(['logger']);

/**
 * Read a JSON file and parse its contents.
 * @param {string} filepath
 * @returns {Promise<Object>}
 */
async function readJson(filepath) {
  return JSON.parse(await fs.readFile(filepath, 'utf8'));
}

/**
 * Stringify an object and write it to a JSON file.
 * @param {string} filepath
 * @param {Object} data
 * @returns {Promise<void>}
 */
async function writeJson(filepath, data) {
  await fs.writeFile(filepath, `${JSON.stringify(data, null, 2)}\n`);
}

/**
 * Get the directories of all packages in the monorepo by looking for package.json files.
 * @returns {Promise<string[]>} An array of package directory paths.
 */
async function getPackageDirs() {
  return (await fs.glob('*/package.json', {cwd: ROOT_PACKAGES_DIR, absolute: true}))
    .map((pkgJsonPath) => path.dirname(pkgJsonPath))
    .sort();
}

/**
 * Copy specified fields from the source object to the destination object.
 * @param {Object} source
 * @param {Object} destination
 * @param {string[]} fields
 */
function copyFields(source, destination, fields) {
  for (const field of fields) {
    destination[field] = source[field];
  }
}

/**
 * Synchronize specific fields from the root package.json to a package's package.json.
 * @param {Object} rootPackageJson
 * @param {string} packageDir
 */
async function syncPackageJsonFields(rootPackageJson, packageDir) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  const packageJson = await readJson(packageJsonPath);
  const packageName = path.basename(packageDir);

  copyFields(
    rootPackageJson,
    packageJson,
    packageName === 'logger' ? LOGGER_COMMON_FIELDS_TO_COPY : COMMON_FIELDS_TO_COPY,
  );

  if (!KEYWORD_EXCLUDED_PACKAGES.has(packageName)) {
    packageJson.keywords = rootPackageJson.keywords;
  }

  log.debug(
    `Updating package.json for ${packageName} at ${packageJsonPath} with fields: ${JSON.stringify(
      Object.keys(packageJson),
    )}`,
  );

  await writeJson(packageJsonPath, packageJson);
}

async function main() {
  const rootPackageJson = await readJson(ROOT_PACKAGE_JSON);
  log.debug(`Root package.json read from ${ROOT_PACKAGE_JSON}`);
  const packageDirs = await getPackageDirs();
  log.debug(`Found ${packageDirs.length} package directories`);

  const syncPackageJsonFieldsPromises = packageDirs.map((packageDir) =>
    syncPackageJsonFields(rootPackageJson, packageDir),
  );
  const licenseCopyPromises = packageDirs
    .filter((packageDir) => !LICENSE_EXCLUDED_PACKAGES.has(path.basename(packageDir)))
    .map((packageDir) => {
      const licensePath = path.join(packageDir, 'LICENSE');
      log.debug(`Copying LICENSE to ${licensePath}`);
      return fs.copyFile(ROOT_LICENSE, licensePath);
    });

  log.debug(`Copying README to ${APPIUM_PACKAGE_README}`);
  const copyingReadmePromise = fs.copyFile(ROOT_README, APPIUM_PACKAGE_README);

  await Promise.all([...syncPackageJsonFieldsPromises, ...licenseCopyPromises, copyingReadmePromise]);
}

await main();

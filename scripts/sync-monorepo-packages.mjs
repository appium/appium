import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {logger, fs} from '@appium/support';

export const log = logger.getLogger('SYNC-MONOREPO-PACKAGES');

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const ROOT_PACKAGE_JSON = path.join(ROOT_DIR, 'package.json');
const ROOT_LICENSE = path.join(ROOT_DIR, 'LICENSE');
const ROOT_README = path.join(ROOT_DIR, 'README.md');
const APPIUM_PACKAGE_README = path.join(ROOT_PACKAGES_DIR, 'appium', 'README.md');

const COMMON_FIELDS = ['author', 'license', 'bugs', 'homepage'];
const LOGGER_COMMON_FIELDS = ['author', 'bugs', 'homepage'];

const KEYWORD_EXCLUDED_PACKAGES = new Set(['eslint-config-appium-ts', 'types']);
// Package names in this set will not receive the LICENSE file from the root,
// as they have their own license terms (e.g., Apache 2.0 for logger).
const LICENSE_EXCLUDED_PACKAGES = new Set(['logger']);

async function readJson(filepath) {
  return JSON.parse(await fs.readFile(filepath, 'utf8'));
}

async function writeJson(filepath, data) {
  await fs.writeFile(filepath, `${JSON.stringify(data, null, 2)}\n`);
}

async function getPackageDirs() {
  const entries = await fs.readdir(ROOT_PACKAGES_DIR, {withFileTypes: true});
  const packageDirs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const dir = path.join(ROOT_PACKAGES_DIR, entry.name);

    try {
      await fs.readFile(path.join(dir, 'package.json'));
    } catch {
      continue;
    }

    packageDirs.push(dir);
  }

  return packageDirs.sort();
}

function copyFields(source, destination, fields) {
  for (const field of fields) {
    destination[field] = source[field];
  }
}

async function syncPackageJsonFields(rootPackageJson, packageDir) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  const packageJson = await readJson(packageJsonPath);
  const packageName = path.basename(packageDir);

  copyFields(
    rootPackageJson,
    packageJson,
    packageName === 'logger' ? LOGGER_COMMON_FIELDS : COMMON_FIELDS
  );

  if (!KEYWORD_EXCLUDED_PACKAGES.has(packageName)) {
    packageJson.keywords = rootPackageJson.keywords;
  }

  log.debug(`Updating package.json for ${packageName} at ${packageJsonPath} with fields: ${JSON.stringify(Object.keys(packageJson))}`);

  await writeJson(packageJsonPath, packageJson);
}

async function main() {
  const rootPackageJson = await readJson(ROOT_PACKAGE_JSON);
  log.debug(`Root package.json read from ${ROOT_PACKAGE_JSON}`);
  const packageDirs = await getPackageDirs();
  log.debug(`Found ${packageDirs.length} package directories`);

  await Promise.all(packageDirs.map((packageDir) => syncPackageJsonFields(rootPackageJson, packageDir)));
  await Promise.all(
    packageDirs
      .filter((packageDir) => !LICENSE_EXCLUDED_PACKAGES.has(path.basename(packageDir)))
      .map((packageDir) => {
        const licensePath = path.join(packageDir, 'LICENSE');
        log.debug(`Copying LICENSE to ${licensePath}`);
        return fs.copyFile(ROOT_LICENSE, licensePath);
      })
  );
  log.debug(`Copying README to ${APPIUM_PACKAGE_README}`);
  await fs.copyFile(ROOT_README, APPIUM_PACKAGE_README);
}

await main();

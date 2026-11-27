import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {fs} from '@appium/support';
import type {DriverClass, DriverType} from '@appium/types';
import type {ExtManifest, ExtName, ExtPackageJson} from 'appium/types/index.js';

import {INSTALL_TYPE_LOCAL, manifestValidator} from './manifest/index.js';

export type EmbeddedDriver = {
  driver: DriverClass;
  driverName: string;
  automationName: string;
  platformNames?: string[];
};

/**
 * Reads and validates an Appium driver's package metadata.
 *
 * @param location - Absolute path or `file:` URL of the driver package or any file in it
 */
export async function readResolvedDriver(
  location: string,
): Promise<{driverName: ExtName<DriverType>; manifest: ExtManifest<DriverType>}> {
  const {installPath, pkgJson} = await findDriverPackageJson(location);
  const {driverName, ...driverMeta} = pkgJson.appium;
  const manifest: ExtManifest<DriverType> = {
    ...driverMeta,
    pkgName: pkgJson.name,
    version: pkgJson.version,
    appiumVersion: pkgJson.peerDependencies?.appium,
    installType: INSTALL_TYPE_LOCAL,
    installSpec: installPath,
    installPath,
  };

  const problems = [
    ...manifestValidator.getCommonManifestProblems(manifest),
    ...manifestValidator.getDriverManifestProblems(manifest),
  ];
  if (problems.length) {
    const details = problems.map(({err, val}) => `${err} (Actual value: ${JSON.stringify(val)})`).join('; ');
    throw new Error(`The driver at ${installPath} cannot be used: ${details}`);
  }
  return {driverName, manifest};
}

/** Derives the driver name, automation name and supported platforms from an imported driver class. */
export function describeEmbeddedDriver(driver: DriverClass): EmbeddedDriver {
  const {automationName: declaredAutomationName, platformNames} = driver as DriverClass & {
    automationName?: unknown;
    platformNames?: unknown;
  };
  const automationName =
    typeof declaredAutomationName === 'string' ? declaredAutomationName : driver.name.replace(/Driver$/, '');
  if (!automationName) {
    throw new TypeError('An embedded Appium driver must have a class name or static automationName');
  }
  if (
    platformNames !== undefined &&
    (!Array.isArray(platformNames) ||
      !platformNames.length ||
      platformNames.some((name) => typeof name !== 'string' || !name.trim()))
  ) {
    throw new TypeError('An embedded driver platformNames must be a non-empty array of platform names');
  }
  const driverName = automationName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (!driverName) {
    throw new TypeError(`Could not derive a driver name from automationName '${automationName}'`);
  }
  return {
    driver,
    driverName,
    automationName,
    platformNames: platformNames === undefined ? undefined : [...(platformNames as string[])],
  };
}

/**
 * Finds the `package.json` of the driver package containing `location`.
 *
 * Nested `package.json` files without a `name`, like ones that only set the module `type`, are skipped.
 *
 * @param location - Absolute path or `file:` URL of the driver package or of any file in it
 */
async function findDriverPackageJson(
  location: string,
): Promise<{installPath: string; pkgJson: ExtPackageJson<DriverType>}> {
  const locationPath = location.startsWith('file:') ? fileURLToPath(location) : location;
  if (!path.isAbsolute(locationPath)) {
    throw new TypeError(`A driver location must be an absolute path or a file URL, but got '${location}'`);
  }
  if (!(await fs.exists(locationPath))) {
    throw new Error(`Could not find a driver at '${location}' because the path does not exist`);
  }

  let dir = (await fs.stat(locationPath)).isDirectory() ? locationPath : path.dirname(locationPath);
  for (;;) {
    const pkgJsonPath = path.join(dir, 'package.json');
    if (await fs.exists(pkgJsonPath)) {
      const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8')) as ExtPackageJson<DriverType>;
      if (typeof pkgJson.name === 'string') {
        if (typeof pkgJson.appium?.driverName !== 'string') {
          throw new Error(
            `The package '${pkgJson.name}' at ${dir} is not an Appium driver: its package.json has no 'appium.driverName' field`,
          );
        }
        return {installPath: path.dirname(pkgJsonPath), pkgJson};
      }
    }
    const parentDir = path.dirname(dir);
    if (parentDir === dir) {
      throw new Error(`Could not find the package.json of a driver package containing '${location}'`);
    }
    dir = parentDir;
  }
}

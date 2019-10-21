import path from 'path';
import _ from 'lodash';
import log from './logger';
import { fs } from 'appium-support';
import { existsSync } from 'fs';

// TODO the location of the driver data file should be configurable
const DRIVERS_JSON = path.resolve(__dirname, '..', '..', '.drivers.json');

// On Appium launch, figure out which drivers are installed
let INSTALLED_DRIVERS = {};

// This is a map of driver names to npm packages representing those drivers.
// The drivers in this list will be available to the CLI so users can just
// type 'appium driver install 'name'', rather than having to specify the full
// npm package. I.e., these are the officially recognized drivers.
const KNOWN_DRIVERS = {
  uiautomator2: 'appium-uiautomator2-driver',
  xcuitest: 'appium-xcuitest-driver',
  youiengine: 'appium-youiengine-driver',
  windows: 'appium-windows-driver',
  mac: 'appium-mac-driver',
  espresso: 'appium-espresso-driver',
  tizen: 'appium-tizen-driver',
};

const INSTALL_TYPE_NPM = 'npm';
const INSTALL_TYPE_LOCAL = 'local';
const INSTALL_TYPE_GITHUB = 'github';
const INSTALL_TYPE_GIT = 'git';
const INSTALL_TYPES = [
  INSTALL_TYPE_GIT,
  INSTALL_TYPE_GITHUB,
  INSTALL_TYPE_LOCAL,
  INSTALL_TYPE_NPM
];

function validateDriversJson (logFn = log.error) {
  try {
    INSTALLED_DRIVERS = require(DRIVERS_JSON);
  } catch (err) {
    if (existsSync(DRIVERS_JSON)) {
      throw new Error(`Appium had trouble loading the driver installation ` +
                      `cache file (${DRIVERS_JSON}). Ensure it exists and is ` +
                      `readable. Specific error: ${err.message}`);
    }

    // if the file just doesn't exist, call it empty
    return {};
  }

  const automationNames = [];
  const problems = {};
  for (const driverName of Object.keys(INSTALLED_DRIVERS)) {
    const {
      platformNames, automationName, version, pkgName, installSpec,
      installType, mainClass
    } = INSTALLED_DRIVERS[driverName];

    const p = problems[driverName] = []; // just a little alias for convenience

    if (!_.isArray(platformNames)) {
      p.push({
        err: 'Missing or incorrect supported platformName list.',
        val: platformNames
      });
    }

    for (const pName of platformNames) {
      if (!_.isString(pName)) {
        p.push({err: 'Incorrectly formatted platformName.', val: pName});
      }
    }

    if (!_.isString(automationName)) {
      p.push({err: 'Missing or incorrect automationName', val: automationName});
    }

    if (_.includes(automationNames, automationName)) {
      p.push({
        err: 'Multiple drivers claim support for the same automationName',
        val: automationName
      });
    }
    automationNames.push(automationName);

    if (!_.isString(version)) {
      p.push({err: 'Missing or incorrect version', val: version});
    }

    if (!_.isString(pkgName)) {
      p.push({err: 'Missing or incorrect NPM package name', val: pkgName});
    }

    if (!_.isString(installSpec)) {
      p.push({err: 'Missing or incorrect installation spec', val: installSpec});
    }

    if (!_.includes(INSTALL_TYPES, installType)) {
      p.push({err: 'Missing or incorrect install type', val: installType});
    }

    if (!_.isString(mainClass)) {
      p.push({err: 'Missing or incorrect driver class name', val: mainClass});
    }
  }

  const problemSummaries = [];
  for (const driverName of Object.keys(problems)) {
    if (!_.isEmpty(problems[driverName])) {
      // remove this driver from the list since it's not valid
      delete INSTALLED_DRIVERS[driverName];
      problemSummaries.push(`Driver ${driverName} had errors and will not ` +
                            `be available. Errors:`);
      for (const problem of problems[driverName]) {
        problemSummaries.push(`  - ${problem.err} (Actual value: ` +
                              `${JSON.stringify(problem.val)})`);
      }
    }
  }

  if (!_.isEmpty(problemSummaries)) {
    logFn(`Appium encountered one or more errors while validating ` +
          `the drivers file (${DRIVERS_JSON}):`);
    for (const summary of problemSummaries) {
      logFn(summary);
    }
  }

  return INSTALLED_DRIVERS;
}

async function writeInstalledDriver (name, data) {
  INSTALLED_DRIVERS[name] = data;
  await fs.writeFile(DRIVERS_JSON, JSON.stringify(INSTALLED_DRIVERS), 'utf-8');
}

function printAvailableDrivers () {
  const driverNames = Object.keys(INSTALLED_DRIVERS);
  if (_.isEmpty(driverNames)) {
    log.info('No drivers have been installed. Use the "appium driver" ' +
             'command to install the one(s) you want to use.');
    return;
  }

  log.info('Available drivers:');
  for (const driverName of Object.keys(INSTALLED_DRIVERS)) {
    const ver = INSTALLED_DRIVERS[driverName].version;
    const aName = INSTALLED_DRIVERS[driverName].automationName;
    log.info(`  - ${driverName}@${ver} (automationName '${aName}')`);
  }
}

function getDriverBySupport (automationName, platformName) {
  for (const driverName of Object.keys(INSTALLED_DRIVERS)) {
    const installed = INSTALLED_DRIVERS[driverName];
    const aNameMatches = installed.automationName.toLowerCase() ===
                         automationName.toLowerCase();
    const pNameMatches = _.includes(installed.platformNames.map(_.toLower),
                                    platformName.toLowerCase());

    if (aNameMatches && pNameMatches) {
      return {driverName, ...installed};
    }

    if (aNameMatches) {
      throw new Error(`Driver '${driverName}' supports automationName ` +
                      `'${automationName}', but Appium could not find ` +
                      `support for platformName '${platformName}'. Supported ` +
                      `platformNames are: ` +
                      JSON.stringify(installed.platformNames));
    }
  }

  throw new Error(`Could not find installed driver to support given caps`);
}

function findMatchingDriver ({automationName, platformName}) {
  if (!_.isString(platformName)) {
    throw new Error('You must include a platformName capability');
  }

  if (!_.isString(automationName)) {
    throw new Error('You must include an automationName capability');
  }

  log.info(`Attempting to find matching driver for automationName ` +
           `'${automationName}' and platformName '${platformName}'`);

  try {
    const {driverName, mainClass, pkgName, version} = getDriverBySupport(automationName, platformName);
    log.info(`The '${driverName}' driver was installed and matched caps.`);
    const driver = require(pkgName)[mainClass];
    if (!driver) {
      throw new Error(`MainClass ${mainClass} did not result in a driver object`);
    }
    return {driver, version};
  } catch (err) {
    const msg = `Could not find a driver for automationName ` +
                `'${automationName}' and platformName ${platformName}'. ` +
                `Have you installed a driver that supports those ` +
                `capabilities? Run 'appium driver list --installed' to see. ` +
                `(Lower-level error: ${err.message})`;
    throw new Error(msg);
  }
}

export {
  validateDriversJson,
  findMatchingDriver,
  printAvailableDrivers,
  writeInstalledDriver,
  KNOWN_DRIVERS,
  INSTALL_TYPE_GIT,
  INSTALL_TYPE_GITHUB,
  INSTALL_TYPE_LOCAL,
  INSTALL_TYPE_NPM,
};

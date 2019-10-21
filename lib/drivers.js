import path from 'path';
import _ from 'lodash';
import log from './logger';

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

function validateDriversJson () {
  try {
    INSTALLED_DRIVERS = require(DRIVERS_JSON);
  } catch (err) {
    throw new Error(`Appium had trouble loading the driver installation ` +
                    `cache file (${DRIVERS_JSON}). Ensure it exists and is ` +
                    `readable. Specific error: ${err}`);
  }
  const automationNames = [];
  let msg = '';
  for (const driverName of Object.keys(INSTALLED_DRIVERS)) {
    const platformNames = INSTALLED_DRIVERS[driverName].platformNames;
    if (!_.isArray(platformNames)) {
      msg += `Drivers.json entry for '${driverName}' has missing or ` +
             `incorrect supported platformName list. `;
    }

    for (const pName of platformNames) {
      if (!_.isString(pName)) {
        msg += `Drivers.json entry for '${driverName}' has an incorrectly ` +
               `formatted platformName. `;
      }
    }

    const automationName = INSTALLED_DRIVERS[driverName].automationName;
    if (!_.isString(automationName)) {
      msg += `Drivers.json entry for '${driverName}' has missing ` +
             `or incorrect automationName. `;
    }
    if (_.includes(automationNames, automationName)) {
      msg += `Multiple drivers claim support for automationName ` +
             `'${automationName}'. `;
    }
    automationNames.push(INSTALLED_DRIVERS[driverName].automationName);

    if (!_.isString(INSTALLED_DRIVERS[driverName].version)) {
      msg += `Drivers.json entry for '${driverName}' has missing ` +
             `or incorrect version. `;
    }

    if (!_.isString(INSTALLED_DRIVERS[driverName].pkg)) {
      msg += `Drivers.json entry for '${driverName}' has missing ` +
             `or incorrect NPM package name. `;
    }

    if (!_.isString(INSTALLED_DRIVERS[driverName].mainClass)) {
      msg += `Drivers.json entry for '${driverName}' has missing ` +
             `or incorrect class name. `;
    }
  }

  if (msg) {
    throw new Error(`Appium encountered an error while trying to verify ` +
              `the data contained in the drivers file (${DRIVERS_JSON}): ` +
              `${msg}Please ensure you have installed drivers correctly ` +
              `using the Appium CLI.`);
  }
}

function printAvailableDrivers () {
  const driverNames = Object.keys(INSTALLED_DRIVERS);
  if (!driverNames.length) {
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
    const lower = (x) => x.toLowerCase();
    const pNameMatches = _.includes(installed.platformNames.map(lower),
                                    platformName.toLowerCase());

    if (aNameMatches && pNameMatches) {
      return {driverName, ...installed};
    } else if (aNameMatches) {
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
    const {driverName, mainClass, pkg, version} = getDriverBySupport(automationName, platformName);
    log.info(`The '${driverName}' driver was installed and matched caps.`);
    const driver = require(pkg)[mainClass];
    return {driver, version};
  } catch (err) {
    const msg = `Could not find a driver for automationName ` +
                `'${automationName}' and platformName ${platformName}'. ` +
                `Have you installed a driver that supports those ` +
                `capabilities? Run 'appium driver list --installed' to see. ` +
                `(Lower-level error: ${err})`;
    throw new Error(msg);
  }
}

export {
  validateDriversJson,
  findMatchingDriver,
  printAvailableDrivers,
  KNOWN_DRIVERS
};

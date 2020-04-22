import path from 'path';
import _ from 'lodash';
import YAML from 'yaml';
import log from './logger';
import { fs, mkdirp } from 'appium-support';

const DRIVERS_YAML = 'drivers.yaml';
const DRIVERS_SCHEMA_REV = 1;

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

async function validateDriversYaml (appiumHome, logFn = log.error) {
  await mkdirp(appiumHome); // ensure appium home exists
  const driversYamlPath = path.resolve(appiumHome, DRIVERS_YAML);
  try {
    const yamlData = YAML.parse(await fs.readFile(driversYamlPath, 'utf-8'));
    // in the future if we need to do anything specific based on schema
    // revision, we can check it as follows
    //   const schemaRev = yamlData.schemaRev;

    // set the list of drivers the user has installed
    INSTALLED_DRIVERS = yamlData.drivers;
  } catch (err) {
    if (await fs.exists(driversYamlPath)) {
      throw new Error(`Appium had trouble loading the driver installation ` +
                      `cache file (${driversYamlPath}). Ensure it exists and is ` +
                      `readable. Specific error: ${err.message}`);
    }

    // if the file just doesn't exist, call it empty
    return {};
  }

  const automationNames = [];
  const foundProblems = {};
  for (const [driverName, {
    platformNames,
    automationName,
    version,
    pkgName,
    installSpec,
    installType,
    installPath,
    mainClass
  }] of _.toPairs(INSTALLED_DRIVERS)) {
    const p = foundProblems[driverName] = []; // just a little alias for convenience

    if (!_.isArray(platformNames)) {
      p.push({
        err: 'Missing or incorrect supported platformName list.',
        val: platformNames
      });
    } else {
      for (const pName of platformNames) {
        if (!_.isString(pName)) {
          p.push({err: 'Incorrectly formatted platformName.', val: pName});
        }
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

    if (!_.isString(installPath)) {
      p.push({err: 'Missing or incorrect installation path', val: installPath});
    }

    if (!_.isString(mainClass)) {
      p.push({err: 'Missing or incorrect driver class name', val: mainClass});
    }
  }

  const problemSummaries = [];
  for (const [driverName, problems] of _.toPairs(foundProblems)) {
    if (!_.isEmpty(problems)) {
      // remove this driver from the list since it's not valid
      delete INSTALLED_DRIVERS[driverName];
      problemSummaries.push(`Driver ${driverName} had errors and will not ` +
                            `be available. Errors:`);
      for (const problem of problems) {
        problemSummaries.push(`  - ${problem.err} (Actual value: ` +
                              `${JSON.stringify(problem.val)})`);
      }
    }
  }

  if (!_.isEmpty(problemSummaries)) {
    logFn(`Appium encountered one or more errors while validating ` +
          `the drivers file (${driversYamlPath}):`);
    for (const summary of problemSummaries) {
      logFn(summary);
    }
  }

  return INSTALLED_DRIVERS;
}

async function writeInstalledDriver (appiumHome, name, data) {
  INSTALLED_DRIVERS[name] = data;
  const driversYamlPath = path.resolve(appiumHome, DRIVERS_YAML);
  const yamlData = {schemaRev: DRIVERS_SCHEMA_REV, drivers: INSTALLED_DRIVERS};
  await fs.writeFile(driversYamlPath, YAML.stringify(yamlData), 'utf-8');
}

function printAvailableDrivers () {
  const driverNames = Object.keys(INSTALLED_DRIVERS);
  if (_.isEmpty(driverNames)) {
    log.info('No drivers have been installed. Use the "appium driver" ' +
             'command to install the one(s) you want to use.');
    return;
  }

  log.info('Available drivers:');
  for (const [driverName, {version, automationName}] of _.toPairs(INSTALLED_DRIVERS)) {
    log.info(`  - ${driverName}@${version} (automationName '${automationName}')`);
  }
}

function getDriverBySupport (matchAutomationName, matchPlatformName) {
  for (const [driverName, driverData] of _.toPairs(INSTALLED_DRIVERS)) {
    const {automationName, platformNames} = driverData;
    const aNameMatches = automationName.toLowerCase() === matchAutomationName.toLowerCase();
    const pNameMatches = _.includes(platformNames.map(_.toLower),
                                    matchPlatformName.toLowerCase());

    if (aNameMatches && pNameMatches) {
      return {driverName, ...driverData};
    }

    if (aNameMatches) {
      throw new Error(`Driver '${driverName}' supports automationName ` +
                      `'${automationName}', but Appium could not find ` +
                      `support for platformName '${matchPlatformName}'. Supported ` +
                      `platformNames are: ` +
                      JSON.stringify(platformNames));
    }
  }

  throw new Error(`Could not find installed driver to support given caps`);
}

function findMatchingDriver (appiumHome, {automationName, platformName}) {
  if (!_.isString(platformName)) {
    throw new Error('You must include a platformName capability');
  }

  if (!_.isString(automationName)) {
    throw new Error('You must include an automationName capability');
  }

  log.info(`Attempting to find matching driver for automationName ` +
           `'${automationName}' and platformName '${platformName}'`);

  try {
    const {
      driverName,
      mainClass,
      pkgName,
      version,
      installPath
    } = getDriverBySupport(automationName, platformName);
    log.info(`The '${driverName}' driver was installed and matched caps.`);
    const pkgPath = path.resolve(appiumHome, installPath, 'node_modules', pkgName);
    log.info(`Will require it at ${pkgPath}`);
    const driver = require(pkgPath)[mainClass];
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
  validateDriversYaml,
  findMatchingDriver,
  printAvailableDrivers,
  writeInstalledDriver,
  KNOWN_DRIVERS,
  INSTALL_TYPES,
  INSTALL_TYPE_GIT,
  INSTALL_TYPE_GITHUB,
  INSTALL_TYPE_LOCAL,
  INSTALL_TYPE_NPM,
};

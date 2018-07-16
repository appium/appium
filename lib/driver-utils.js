import semver from 'semver';
import _ from 'lodash';
import { getPackageVersion } from './utils';
import log from './logger';
import drivers from '../../drivers.json'; // eslint-disable-line import/no-unresolved


// add the version to each driver in the hash
const DRIVER_MAP = _.toPairs(drivers).reduce(function (drivers, [driver, info]) {
  info.version = getPackageVersion(info.packageName);
  drivers[driver] = info;
  return drivers;
}, {});

// pull the automation names from the driver hash
function pullAutomationNames () {
  return _.values(DRIVER_MAP).reduce(function (automationNames, {automationName}) {
    if (automationName) {
      automationNames.push(automationName);
    }
    return automationNames;
  }, ['Appium']);
}
const AUTOMATION_NAMES = pullAutomationNames();

function pullPlatformNames () {
  return _.values(DRIVER_MAP).reduce(function (platforms, driver) {
    if (driver.platformName) {
      platforms.push(driver.platformName);
    }
    return platforms;
  }, []);
}
const PLATFORM_NAMES = pullPlatformNames();

let helpers = {};

// function for testing purposes only
helpers.injectDriverMap = function injectDriverMap (driverMap) {
  // circumvent the const-ness of DRIVER_MAP
  for (const driver of _.keys(DRIVER_MAP)) {
    delete DRIVER_MAP[driver];
  }
  for (const [driver, info] of _.toPairs(driverMap)) {
    DRIVER_MAP[driver] = info;
  }

  // circumvent the const-ness of AUTOMATION_NAMES
  while (AUTOMATION_NAMES.length) {
    AUTOMATION_NAMES.pop();
  }
  for (const name of pullAutomationNames()) {
    AUTOMATION_NAMES.push(name);
  }

  // circumvent the const-ness of PLATFORM_NAMES
  while (PLATFORM_NAMES.length) {
    PLATFORM_NAMES.pop();
  }
  for (const name of pullPlatformNames()) {
    PLATFORM_NAMES.push(name);
  }
};

helpers.getDriverClass = function getDriverClass (packageName, driverClass) {
  if (DRIVER_MAP[driverClass].driver) {
    return DRIVER_MAP[driverClass].driver;
  }
  try {
    log.debug(`Loading driver '${driverClass}' from '${packageName}'`);
    const driver = require(packageName)[driverClass];

    // cache the drivers
    DRIVER_MAP[driverClass].driver = driver;

    return driver;
  } catch (err) {
    log.errorAndThrow(`Unable to load driver '${driverClass}' from package '${packageName}': ${err.message}`);
  }
};

function getDriverFromConstraints (caps, driverInfo) {
  const getAlternativeDriver = function getAlternativeDriver (driverInfo) {
    let alternativeDriver;
    for (const constraint of (driverInfo.constraints || [])) {
      if (constraint.type === 'capability') {
        if (constraint.capability === 'platformVersion') {
          const platformVersion = semver.valid(semver.coerce(caps.platformVersion));
          if (platformVersion && semver.satisfies(platformVersion, constraint.condition)) {
            if (constraint.message) {
              log.warn(constraint.message);
            }
            if (constraint.alternativeDriver) {
              alternativeDriver = constraint.alternativeDriver;
            }
          }
        }
      }
    }
    return alternativeDriver;
  };

  // drill down through constraints to get to the last driver that fits
  let alternativeDriver = getAlternativeDriver(driverInfo);
  while (alternativeDriver) {
    const driver = getAlternativeDriver(DRIVER_MAP[alternativeDriver]);
    // finish if there is no alternative, or the alternative is the same as
    // the one we already have (this happens if the constraint is meant to just
    // log information)
    if (!driver || driver === alternativeDriver) {
      break;
    }
    alternativeDriver = driver;
  }

  if (alternativeDriver) {
    const modifiedDriverClass = DRIVER_MAP[alternativeDriver].driverClass;
    const modifiedPackageName = DRIVER_MAP[alternativeDriver].packageName;
    if (modifiedDriverClass && modifiedPackageName) {
      return [modifiedPackageName, modifiedDriverClass];
    }
  }
  return [];
}

function getDriverFromAutomationName (caps) {
  let packageName;
  let driverClass;
  if (_.isString(caps.automationName)) {
    const name = caps.automationName.toLowerCase();
    for (const info of _.values(DRIVER_MAP)) {
      if (_.toLower(info.automationName) !== name) {
        continue;
      }

      // this fits the automationName
      driverClass = info.driverClass;
      packageName = info.packageName;

      // now check if there are constraints on this driver
      const [modifiedPackageName, modifiedDriverClass] = getDriverFromConstraints(caps, info);
      if (modifiedPackageName && modifiedDriverClass) {
        packageName = modifiedPackageName;
        driverClass = modifiedDriverClass;
      }
      // no need to go further
      break;
    }
  }

  return [packageName, driverClass];
}

function getDriverFromPlatformName (caps) {
  let packageName;
  let driverClass;
  for (const info of _.values(DRIVER_MAP)) {
    if (_.toLower(info.platformName) !== _.toLower(caps.platformName)) {
      continue;
    }

    // this fits the platformName
    driverClass = info.driverClass;
    packageName = info.packageName;

    // now check if there are constraints on this driver
    const [modifiedPackageName, modifiedDriverClass] = getDriverFromConstraints(caps, info);
    if (modifiedPackageName && modifiedDriverClass) {
      packageName = modifiedPackageName;
      driverClass = modifiedDriverClass;
    }
    // no need to go further
    break;
  }

  return [packageName, driverClass];
}

function getDriver (caps) {
  if (!_.isString(caps.platformName)) {
    throw new Error('You must include a platformName capability');
  }

  let [packageName, driverClass] = getDriverFromAutomationName(caps);
  if (!packageName || !driverClass) {
    ([packageName, driverClass] = getDriverFromPlatformName(caps));
  }

  if (packageName && driverClass) {
    return helpers.getDriverClass(packageName, driverClass);
  }

  const msg = _.isString(caps.automationName)
    ? `Could not find a driver for automationName '${caps.automationName}' and platformName ` +
          `'${caps.platformName}'.`
    : `Could not find a driver for platformName '${caps.platformName}'.`;
  throw new Error(`${msg} Please check your desired capabilities.`);
}

function getVersion (driver) {
  const {version} = DRIVER_MAP[driver.name] || {};
  if (version) {
    return version;
  }
  log.warn(`Unable to get version of driver '${driver.name}'`);
}


export { getDriver, getVersion, helpers, DRIVER_MAP, AUTOMATION_NAMES, PLATFORM_NAMES };
export default getDriver;

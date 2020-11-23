import _ from 'lodash';
import log from './logger';


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
  flutter: 'appium-flutter-driver',
  safari: 'appium-safari-driver',
  gecko: 'appium-geckodriver',
};

function getDriverBySupport (drivers, matchAutomationName, matchPlatformName) {
  for (const [driverName, driverData] of _.toPairs(drivers)) {
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

function findMatchingDriver (config, {automationName, platformName}) {
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
      version,
    } = getDriverBySupport(config.installedExtensions, automationName, platformName);
    log.info(`The '${driverName}' driver was installed and matched caps.`);
    log.info(`Will require it at ${config.getExtensionRequirePath(driverName)}`);
    const driver = config.require(driverName);
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
  findMatchingDriver,
  KNOWN_DRIVERS,
};

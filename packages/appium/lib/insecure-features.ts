import _ from 'lodash';
import logger from './logger';

import type {AppiumDriver} from './appium';
import type {ExternalDriver} from '@appium/types';

const ALL_DRIVERS_MATCH = '*';
const FEATURE_NAME_SEPARATOR = ':';

/**
 * Configures insecure features according to the values in `args.relaxedSecurityEnabled`,
 * `args.allowInsecure`, and `args.denyInsecure`, and informs the user about any
 * globally-applied features.
 * Uses `logger` instead of `this.log` to reduce user confusion.
 */
export function configureGlobalFeatures(this: AppiumDriver) {
  if (this.args.relaxedSecurityEnabled) {
    logger.info(
      `Enabling relaxed security. All insecure features will be ` +
        `enabled unless explicitly disabled by --deny-insecure`,
    );
    this.relaxedSecurityEnabled = true;
  } else if (!_.isEmpty(this.args.allowInsecure)) {
    this.allowInsecure = validateFeatures(this.args.allowInsecure);
    const globalAllowedFeatures = filterInsecureFeatures(this.allowInsecure);
    if (!_.isEmpty(globalAllowedFeatures)) {
      logger.info('Explicitly enabling insecure features:');
      globalAllowedFeatures.forEach((a) => logger.info(`    ${a}`));
    }
  }
  if (_.isEmpty(this.args.denyInsecure)) {
    return;
  }
  this.denyInsecure = validateFeatures(this.args.denyInsecure);
  const globalDeniedFeatures = filterInsecureFeatures(this.denyInsecure);
  if (_.isEmpty(globalDeniedFeatures)) {
    return;
  }
  logger.info('Explicitly disabling insecure features:');
  globalDeniedFeatures.forEach((a) => logger.info(`    ${a}`));
}

/**
 * If anything in the umbrella driver's insecure feature configuration applies to this driver,
 * assign it to the driver instance
 *
 * @param driver
 * @param driverName
 */
export function configureDriverFeatures(
  this: AppiumDriver,
  driver: ExternalDriver,
  driverName: string,
) {
  if (this.relaxedSecurityEnabled) {
    this.log.info(
      `Enabling relaxed security for this session as per the server configuration. ` +
        `All insecure features will be enabled unless explicitly disabled by --deny-insecure`,
    );
    driver.relaxedSecurityEnabled = true;
  }
  const allowedDriverFeatures = filterInsecureFeatures(this.allowInsecure, driverName);
  if (!_.isEmpty(allowedDriverFeatures)) {
    this.log.info('Explicitly enabling insecure features for this session ' +
      'as per the server configuration:',
    );
    allowedDriverFeatures.forEach((a) => this.log.info(`    ${a}`));
    driver.allowInsecure = allowedDriverFeatures;
  }
  const deniedDriverFeatures = filterInsecureFeatures(this.denyInsecure, driverName);
  if (_.isEmpty(deniedDriverFeatures)) {
    return;
  }
  this.log.info('Explicitly disabling insecure features for this session ' +
    'as per the server configuration:',
  );
  deniedDriverFeatures.forEach((a) => this.log.info(`    ${a}`));
  driver.denyInsecure = deniedDriverFeatures;
}

/**
 * Validates the list of allowed/denied server features
 *
 * @param features
 */
function validateFeatures(features: string[]): string[] {
  const validator = (fullName: string) => {
    const separatorPos = fullName.indexOf(FEATURE_NAME_SEPARATOR);
    // TODO: This is for the backward compatibility with Appium2
    // TODO: In Appium3 the separator will be mandatory
    if (separatorPos < 0) {
      return `${ALL_DRIVERS_MATCH}${FEATURE_NAME_SEPARATOR}${fullName}`;
    }

    const [automationName, featureName] = [
      fullName.substring(0, separatorPos),
      fullName.substring(separatorPos + 1)
    ];
    if (!automationName || !featureName) {
      throw new Error(
        `The full feature name must include both the destination automation name or the ` +
        `'${ALL_DRIVERS_MATCH}' wildcard to apply the feature to all installed drivers, and ` +
        `the feature name split by a colon, got '${fullName}' instead`
      );
    }
    return fullName;
  };
  return features.map(validator);
}

/**
 * Filters the list of insecure features to only those that are
 * applicable to the given driver name.
 * Assumes that all feature names have already been validated
 *
 * @param features
 * @param driverName
 */
function filterInsecureFeatures(
  features: string[],
  driverName: string = ALL_DRIVERS_MATCH
): string[] {
  const filterFn = (fullName: string) => {
    const separatorPos = fullName.indexOf(FEATURE_NAME_SEPARATOR);
    if (separatorPos <= 0) {
      return false;
    }
    const automationName = fullName.substring(0, separatorPos);
    return [driverName, ALL_DRIVERS_MATCH].includes(automationName);
  };
  return features.filter(filterFn);
}

import _ from 'lodash';
import {DRIVER_TYPE} from '../constants';
import log from '../logger';
import {ExtensionConfig} from './extension-config';

/**
 * @extends {ExtensionConfig<DriverType>}
 */
export class DriverConfig extends ExtensionConfig {
  /**
   * A set of unique automation names used by drivers.
   * @type {Set<string>}
   */
  knownAutomationNames;

  /**
   * A mapping of {@link Manifest} instances to {@link DriverConfig} instances.
   *
   * `Manifest` and `ExtensionConfig` have a one-to-many relationship; each `Manifest` should be associated with a `DriverConfig` and a `PluginConfig`; no more, no less.
   *
   * This variable tracks the `Manifest`-to-`DriverConfig` portion.
   *
   * @type {WeakMap<Manifest,DriverConfig>}
   * @private
   */
  static _instances = new WeakMap();

  /**
   * Call {@link DriverConfig.create} instead.
   * @private
   * @param {import('./manifest').Manifest} manifest - Manifest instance
   */
  constructor(manifest) {
    super(DRIVER_TYPE, manifest);

    this.knownAutomationNames = new Set();
  }

  /**
   * Creates a new {@link DriverConfig} instance for a {@link Manifest} instance.
   *
   * @param {Manifest} manifest
   * @throws If `manifest` already associated with a `DriverConfig`
   * @returns {DriverConfig}
   */
  static create(manifest) {
    const instance = new DriverConfig(manifest);
    if (DriverConfig.getInstance(manifest)) {
      throw new Error(
        `Manifest with APPIUM_HOME ${manifest.appiumHome} already has a DriverConfig; use DriverConfig.getInstance() to retrieve it.`
      );
    }
    DriverConfig._instances.set(manifest, instance);
    return instance;
  }

  /**
   * Returns a DriverConfig associated with a Manifest
   * @param {Manifest} manifest
   * @returns {DriverConfig|undefined}
   */
  static getInstance(manifest) {
    return DriverConfig._instances.get(manifest);
  }

  /**
   * Checks extensions for problems
   */
  async validate() {
    this.knownAutomationNames.clear();
    return await super._validate(this.manifest.getExtensionData(DRIVER_TYPE));
  }

  /**
   * @param {ExtManifest<DriverType>} extData
   * @returns {import('./extension-config').ExtManifestProblem[]}
   */
  getConfigProblems(extData) {
    const problems = [];
    const {platformNames, automationName} = extData;

    if (!_.isArray(platformNames)) {
      problems.push({
        err: 'Missing or incorrect supported platformNames list.',
        val: platformNames,
      });
    } else {
      if (_.isEmpty(platformNames)) {
        problems.push({
          err: 'Empty platformNames list.',
          val: platformNames,
        });
      } else {
        for (const pName of platformNames) {
          if (!_.isString(pName)) {
            problems.push({
              err: 'Incorrectly formatted platformName.',
              val: pName,
            });
          }
        }
      }
    }

    if (!_.isString(automationName)) {
      problems.push({
        err: 'Missing or incorrect automationName',
        val: automationName,
      });
    }

    if (this.knownAutomationNames.has(automationName)) {
      problems.push({
        err: 'Multiple drivers claim support for the same automationName',
        val: automationName,
      });
    }

    // should we retain the name at the end of this function, once we've checked there are no problems?
    this.knownAutomationNames.add(automationName);

    return problems;
  }

  /**
   * @param {ExtName<DriverType>} driverName
   * @param {ExtManifest<DriverType>} extData
   * @returns {string}
   */
  extensionDesc(driverName, {version, automationName}) {
    return `${driverName}@${version} (automationName '${automationName}')`;
  }

  /**
   * Given capabilities, find a matching driver within the config. Load its class and return it along with version and driver name.
   * @template {import('@appium/types').StringRecord} C
   * @param {C} caps
   * @returns {Promise<MatchedDriver>}
   */
  async findMatchingDriver({automationName, platformName}) {
    if (!_.isString(platformName)) {
      throw new Error('You must include a platformName capability');
    }

    if (!_.isString(automationName)) {
      throw new Error('You must include an automationName capability');
    }

    log.info(
      `Attempting to find matching driver for automationName ` +
        `'${automationName}' and platformName '${platformName}'`
    );

    try {
      const {driverName, mainClass, version} = this._getDriverBySupport(
        automationName,
        platformName
      );
      log.info(`The '${driverName}' driver was installed and matched caps.`);
      log.info(`Will require it at ${this.getInstallPath(driverName)}`);
      const driver = await this.requireAsync(driverName);
      if (!driver) {
        throw new Error(
          `Driver '${driverName}' did not export a class with name '${mainClass}'. Contact the author of the driver!`
        );
      }
      return {driver, version, driverName};
    } catch (err) {
      const msg =
        `Could not find a driver for automationName ` +
        `'${automationName}' and platformName '${platformName}'. ` +
        `Have you installed a driver that supports those ` +
        `capabilities? Run 'appium driver list --installed' to see. ` +
        `(Lower-level error: ${err.message})`;
      throw new Error(msg);
    }
  }

  /**
   * Given an automation name and platform name, find a suitable driver and return its extension data.
   * @param {string} matchAutomationName
   * @param {string} matchPlatformName
   * @returns {ExtMetadata<DriverType> & import('appium/types').InternalMetadata & import('appium/types').CommonExtMetadata}
   */
  _getDriverBySupport(matchAutomationName, matchPlatformName) {
    const drivers = this.installedExtensions;
    for (const [driverName, driverData] of _.toPairs(drivers)) {
      const {automationName, platformNames} = driverData;
      const aNameMatches = automationName.toLowerCase() === matchAutomationName.toLowerCase();
      const pNameMatches = _.includes(
        platformNames.map(_.toLower),
        matchPlatformName.toLowerCase()
      );

      if (aNameMatches && pNameMatches) {
        return {driverName, ...driverData};
      }

      if (aNameMatches) {
        throw new Error(
          `Driver '${driverName}' supports automationName ` +
            `'${automationName}', but Appium could not find ` +
            `support for platformName '${matchPlatformName}'. Supported ` +
            `platformNames are: ` +
            JSON.stringify(platformNames)
        );
      }
    }

    throw new Error(`Could not find installed driver to support given caps`);
  }
}

/**
 * @template {ExtensionType} T
 * @typedef {import('appium/types').ExtMetadata<T>} ExtMetadata
 */

/**
 * @template {ExtensionType} T
 * @typedef {import('appium/types').ExtManifest<T>} ExtManifest
 */

/**
 * @typedef {import('@appium/types').ExtensionType} ExtensionType
 * @typedef {import('appium/types').ManifestData} ManifestData
 * @typedef {import('@appium/types').DriverType} DriverType
 * @typedef {import('./manifest').Manifest} Manifest
 */

/**
 * @template {ExtensionType} T
 * @typedef {import('appium/types').ExtRecord<T>} ExtRecord
 */

/**
 * @template {ExtensionType} T
 * @typedef {import('appium/types').ExtName<T>} ExtName
 */

/**
 * Return value of {@linkcode DriverConfig.findMatchingDriver}
 * @typedef MatchedDriver
 * @property {import('@appium/types').DriverClass} driver
 * @property {string} version
 * @property {string} driverName
 */

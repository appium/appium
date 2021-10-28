// @ts-check

import _ from 'lodash';
import ExtensionConfig from './extension-config';
import { DRIVER_TYPE } from './ext-config-io';

export default class DriverConfig extends ExtensionConfig {
  /**
   * A mapping of `APPIUM_HOME` values to {@link DriverConfig} instances.
   * Each `APPIUM_HOME` should only have one associated `DriverConfig` instance.
   * @type {Record<string,DriverConfig>}
   * @private
   */
  static _instances = {};

  /**
   * Call {@link DriverConfig.getInstance} instead.
   * @private
   * @param {string} appiumHome
   * @param {(...args: any[]) => void} [logFn]
   */
  constructor (appiumHome, logFn) {
    super(appiumHome, DRIVER_TYPE, logFn);
    /** @type {Set<string>} */
    this.knownAutomationNames = new Set();
  }

  async read () {
    this.knownAutomationNames.clear();
    return await super.read();
  }

  /**
   * Creates or gets an instance of {@link DriverConfig} based value of `appiumHome`
   * @param {string} appiumHome - `APPIUM_HOME` path
   * @param {(...args: any[]) => void} [logFn] - Optional logging function
   * @returns {DriverConfig}
   */
  static getInstance (appiumHome, logFn) {
    const instance = DriverConfig._instances[appiumHome] ?? new DriverConfig(appiumHome, logFn);
    DriverConfig._instances[appiumHome] = instance;
    return instance;
  }

  /**
   *
   * @param {object} extData
   * @param {string} extName
   * @returns {import('./extension-config').Problem[]}
   */
  // eslint-disable-next-line no-unused-vars
  getConfigProblems (extData, extName) {
    const problems = [];
    const {platformNames, automationName} = extData;

    if (!_.isArray(platformNames)) {
      problems.push({
        err: 'Missing or incorrect supported platformNames list.',
        val: platformNames
      });
    } else {
      if (_.isEmpty(platformNames)) {
        problems.push({
          err: 'Empty platformNames list.',
          val: platformNames
        });
      } else {
        for (const pName of platformNames) {
          if (!_.isString(pName)) {
            problems.push({err: 'Incorrectly formatted platformName.', val: pName});
          }
        }
      }
    }

    if (!_.isString(automationName)) {
      problems.push({err: 'Missing or incorrect automationName', val: automationName});
    }

    if (this.knownAutomationNames.has(automationName)) {
      problems.push({
        err: 'Multiple drivers claim support for the same automationName',
        val: automationName
      });
    }

    // should we retain the name at the end of this function, once we've checked there are no problems?
    this.knownAutomationNames.add(automationName);

    return problems;
  }

  /**
   * @param {string} driverName
   * @param {object} extData
   */
  extensionDesc (driverName, {version, automationName}) {
    return `${driverName}@${version} (automationName '${automationName}')`;
  }
}


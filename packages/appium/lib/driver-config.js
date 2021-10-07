// @ts-check

import _ from 'lodash';
import ExtensionConfig, { DRIVER_TYPE } from './extension-config';

export default class DriverConfig extends ExtensionConfig {
  /**
   *
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


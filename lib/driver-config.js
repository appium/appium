import _ from 'lodash';
import ExtensionConfig, { DRIVER_TYPE } from './extension-config';

export default class DriverConfig extends ExtensionConfig {
  constructor (appiumHome, logFn = null) {
    super(appiumHome, DRIVER_TYPE, logFn);
  }

  getConfigProblems (driver) {
    const problems = [];
    const automationNames = [];
    const {platformNames, automationName} = driver;

    if (!_.isArray(platformNames)) {
      problems.push({
        err: 'Missing or incorrect supported platformName list.',
        val: platformNames
      });
    } else {
      for (const pName of platformNames) {
        if (!_.isString(pName)) {
          problems.push({err: 'Incorrectly formatted platformName.', val: pName});
        }
      }
    }

    if (!_.isString(automationName)) {
      problems.push({err: 'Missing or incorrect automationName', val: automationName});
    }

    if (_.includes(automationNames, automationName)) {
      problems.push({
        err: 'Multiple drivers claim support for the same automationName',
        val: automationName
      });
    }
    automationNames.push(automationName);
  }

  extensionDesc (driverName, {version, automationName}) {
    return `${driverName}@${version} (automationName '${automationName}')`;
  }
}


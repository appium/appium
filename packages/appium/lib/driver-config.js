import _ from 'lodash';
import ExtensionConfig, { DRIVER_TYPE } from './extension-config';
import { readExtensionSchema } from './schema';
import path from 'path';

const ALLOWED_ARG_SCHEMA_EXTNAMES = ['.json', '.js', '.cjs'];

export default class DriverConfig extends ExtensionConfig {
  constructor (appiumHome, logFn = null) {
    super(appiumHome, DRIVER_TYPE, logFn);
    this.knownAutomationNames = new Set();
  }

  getConfigProblems (driver) {
    const problems = [];
    const {platformNames, automationName, schema: argSchemaPath} = driver;

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

    if (!_.isUndefined(argSchemaPath)) {
      if (!_.isString(argSchemaPath)) {
        problems.push({
          err: 'Incorrectly formatted schema field.',
          val: argSchemaPath
        });
      } else {
        const argSchemaPathExtName = path.extname(argSchemaPath);
        if (!_.includes(ALLOWED_ARG_SCHEMA_EXTNAMES, argSchemaPathExtName)) {
          problems.push({
            err: `Schema file has unsupported extension. Allowed: ${ALLOWED_ARG_SCHEMA_EXTNAMES.join(', ')}`,
            val: argSchemaPath
          });
        } else {
          try {
            readExtensionSchema(DRIVER_TYPE, driver);
          } catch (err) {
            problems.push({err: `Unable to register schema at path ${argSchemaPath}`, val: argSchemaPath});
          }
        }
      }
    }

    return problems;
  }

  extensionDesc (driverName, {version, automationName}) {
    return `${driverName}@${version} (automationName '${automationName}')`;
  }
}


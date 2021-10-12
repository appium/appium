// @ts-check

import _ from 'lodash';
import os from 'os';
import path from 'path';
import { getExtConfigIOInstance } from './ext-config-io';
import log from './logger';
import { ALLOWED_SCHEMA_EXTENSIONS, readExtensionSchema } from './schema';

const DEFAULT_APPIUM_HOME = path.resolve(os.homedir(), '.appium');
const APPIUM_HOME = process.env.APPIUM_HOME || DEFAULT_APPIUM_HOME;

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

export default class ExtensionConfig {
  /**
   *
   * @param {string} appiumHome - `APPIUM_HOME`
   * @param {ExtensionType} extensionType - Type of extension
   * @param {(...args: any[]) => void} [logFn]
   */
  constructor (appiumHome, extensionType, logFn) {
    if (!_.isFunction(logFn)) {
      logFn = log.error.bind(log);
    }
    this.appiumHome = appiumHome;
    /**
     * @type {Record<string,object>}
     */
    this.installedExtensions = {};
    this.io = getExtConfigIOInstance(appiumHome);
    this.extensionType = extensionType;
    /** @type {'drivers'|'plugins'} */
    this.configKey = `${extensionType}s`;
    this.log = /** @type {(...args: any[])=>void} */(logFn);
  }

  /**
   * Checks extensions for problems
   * @template ExtData
   * @param {ExtData[]} exts - Array of extData objects
   * @returns {ExtData[]}
   */
  validate (exts) {
    const foundProblems = {};
    for (const [extName, extData] of _.toPairs(exts)) {
      foundProblems[extName] = [
        ...this.getGenericConfigProblems(extData, extName),
        ...this.getConfigProblems(extData, extName),
        ...this.getSchemaProblems(extData, extName)
      ];
    }

    const problemSummaries = [];
    for (const [extName, problems] of _.toPairs(foundProblems)) {
      if (_.isEmpty(problems)) {
        continue;
      }
      // remove this extension from the list since it's not valid
      delete exts[extName];
      problemSummaries.push(`${this.extensionType} ${extName} had errors and will not ` +
                            `be available. Errors:`);
      for (const problem of problems) {
        problemSummaries.push(`  - ${problem.err} (Actual value: ` +
                              `${JSON.stringify(problem.val)})`);
      }
    }

    if (!_.isEmpty(problemSummaries)) {
      this.log(`Appium encountered one or more errors while validating ` +
               `the ${this.configKey} extension file (${this.io.filepath}):`);
      for (const summary of problemSummaries) {
        this.log(summary);
      }
    }

    return exts;
  }

  /**
   * @param {object} extData
   * @param {string} extName
   * @returns {Problem[]}
   */
  getSchemaProblems (extData, extName) {
    const problems = [];
    const {schema: argSchemaPath} = extData;
    if (argSchemaPath) {
      if (_.isString(argSchemaPath)) {
        const argSchemaPathFileExtName = path.extname(argSchemaPath);
        if (ALLOWED_SCHEMA_EXTENSIONS.has(argSchemaPathFileExtName)) {
          try {
            readExtensionSchema(this.extensionType, extName, extData);
          } catch (err) {
            problems.push({err: `Unable to register schema at path ${argSchemaPath}`, val: argSchemaPath});
          }
        } else {
          problems.push({
            err: `Schema file has unsupported extension. Allowed: ${[...ALLOWED_SCHEMA_EXTENSIONS].join(', ')}`,
            val: argSchemaPath
          });
        }
      } else {
        problems.push({
          err: 'Incorrectly formatted schema field; must be a path to a schema file.',
          val: argSchemaPath
        });
      }
    }
    return problems;
  }

  /**
   * @param {object} extData
   * @param {string} extName
   * @returns {Problem[]}
   */
  // eslint-disable-next-line no-unused-vars
  getGenericConfigProblems (extData, extName) {
    const {version, pkgName, installSpec, installType, installPath, mainClass} = extData;
    const problems = [];

    if (!_.isString(version)) {
      problems.push({err: 'Missing or incorrect version', val: version});
    }

    if (!_.isString(pkgName)) {
      problems.push({err: 'Missing or incorrect NPM package name', val: pkgName});
    }

    if (!_.isString(installSpec)) {
      problems.push({err: 'Missing or incorrect installation spec', val: installSpec});
    }

    if (!_.includes(INSTALL_TYPES, installType)) {
      problems.push({err: 'Missing or incorrect install type', val: installType});
    }

    if (!_.isString(installPath)) {
      problems.push({err: 'Missing or incorrect installation path', val: installPath});
    }

    if (!_.isString(mainClass)) {
      problems.push({err: 'Missing or incorrect driver class name', val: mainClass});
    }

    return problems;
  }

  /**
   * @param {object} extData
   * @param {string} extName
   * @returns {Problem[]}
   */
  // eslint-disable-next-line no-unused-vars
  getConfigProblems (extData, extName) {
    // shoud override this method if special validation is necessary for this extension type
    return [];
  }

  /**
   * @returns {Promise<typeof this.installedExtensions>}
   */
  async read () {
    const extensions = await this.io.read(this.extensionType);
    this.installedExtensions = this.validate(extensions);
    return this.installedExtensions;
  }

  /**
   * @returns {Promise<boolean>}
   */
  async write () {
    return await this.io.write();
  }

  /**
   * @param {string} extName
   * @param {object} extData
   * @returns {Promise<void>}
   */
  async addExtension (extName, extData) {
    this.installedExtensions[extName] = extData;
    await this.write();
  }

  /**
   * @param {string} extName
   * @param {object} extData
   * @returns {Promise<void>}
   */
  async updateExtension (extName, extData) {
    this.installedExtensions[extName] = {
      ...this.installedExtensions[extName],
      ...extData,
    };
    await this.write();
  }

  /**
   * @param {string} extName
   * @returns {Promise<void>}
   */
  async removeExtension (extName) {
    delete this.installedExtensions[extName];
    await this.write();
  }

  print () {
    const extNames = Object.keys(this.installedExtensions);
    if (_.isEmpty(extNames)) {
      log.info(`No ${this.configKey} have been installed. Use the "appium ${this.extensionType}" ` +
               'command to install the one(s) you want to use.');
      return;
    }

    log.info(`Available ${this.configKey}:`);
    for (const [extName, extData] of _.toPairs(this.installedExtensions)) {
      log.info(`  - ${this.extensionDesc(extName, extData)}`);
    }
  }

  /**
   * Returns a string describing the extension. Subclasses must implement.
   * @param {string} extName - Extension name
   * @param {object} extData - Extension data
   * @returns {string}
   * @abstract
   */
  // eslint-disable-next-line no-unused-vars
  extensionDesc (extName, extData) {
    throw new Error('This must be implemented in a subclass');
  }

  /**
   * @param {string} extName
   * @returns {string}
   */
  getExtensionRequirePath (extName) {
    const {pkgName, installPath} = this.installedExtensions[extName];
    return path.resolve(this.appiumHome, installPath, 'node_modules', pkgName);
  }

  /**
   * @param {string} extName
   * @returns {string}
   */
  getInstallPath (extName) {
    const {installPath} = this.installedExtensions[extName];
    return path.resolve(this.appiumHome, installPath);
  }

  /**
   * Loads extension and returns its main class
   * @param {string} extName
   * @returns {(...args: any[]) => object }
   */
  require (extName) {
    const {mainClass} = this.installedExtensions[extName];
    const reqPath = this.getExtensionRequirePath(extName);
    const reqResolved = require.resolve(reqPath);
    if (process.env.APPIUM_RELOAD_EXTENSIONS && require.cache[reqResolved]) {
      log.debug(`Removing ${reqResolved} from require cache`);
      delete require.cache[reqResolved];
    }
    return require(reqPath)[mainClass];
  }

  /**
   * @param {string} extName
   * @returns {boolean}
   */
  isInstalled (extName) {
    return _.includes(Object.keys(this.installedExtensions), extName);
  }
}


/**
 * Config problem
 * @typedef {Object} Problem
 * @property {string} err - Error message
 * @property {any} val - Associated value
 */

/**
 * Alias
 * @typedef {import('./ext-config-io').ExtensionType} ExtensionType
 */

export { DRIVER_TYPE, PLUGIN_TYPE } from './ext-config-io';
export {
  INSTALL_TYPE_NPM, INSTALL_TYPE_GIT, INSTALL_TYPE_LOCAL, INSTALL_TYPE_GITHUB,
  INSTALL_TYPES, DEFAULT_APPIUM_HOME, APPIUM_HOME
};

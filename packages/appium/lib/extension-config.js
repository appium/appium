import _ from 'lodash';
import log from './logger';
import { fs, mkdirp } from '@appium/support';
import path from 'path';
import os from 'os';
import YAML from 'yaml';

const DRIVER_TYPE = 'driver';
const PLUGIN_TYPE = 'plugin';
const DEFAULT_APPIUM_HOME = path.resolve(os.homedir(), '.appium');

const CONFIG_FILE_NAME = 'extensions.yaml';
const CONFIG_SCHEMA_REV = 2;

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
  constructor (appiumHome, extensionType, logFn = null) {
    if (logFn === null) {
      logFn = log.error.bind(log);
    }
    this.appiumHome = appiumHome;
    this.configFile = path.resolve(this.appiumHome, CONFIG_FILE_NAME);
    this.installedExtensions = {};
    this.extensionType = extensionType;
    this.configKey = `${extensionType}s`;
    this.yamlData = {[`${DRIVER_TYPE}s`]: {}, [`${PLUGIN_TYPE}s`]: {}};
    this.log = logFn;
  }

  validate (exts) {
    const foundProblems = {};
    for (const [extName, extData] of _.toPairs(exts)) {
      foundProblems[extName] = [
        ...this.getGenericConfigProblems(extData),
        ...this.getConfigProblems(extData)
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
               `the ${this.configKey} extension file (${this.configFile}):`);
      for (const summary of problemSummaries) {
        this.log(summary);
      }
    }

    return exts;
  }

  getGenericConfigProblems (ext) {
    const {version, pkgName, installSpec, installType, installPath, mainClass} = ext;
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

  getConfigProblems (/*ext*/) {
    // shoud override this method if special validation is necessary for this extension type
    return [];
  }

  applySchemaMigrations () {
    if (this.yamlData.schemaRev < 2 && _.isUndefined(this.yamlData[PLUGIN_TYPE])) {
      // at schema revision 2, we started including plugins as well as drivers in the file,
      // so make sure we at least have an empty section for it
      this.yamlData[PLUGIN_TYPE] = {};
    }
  }

  async read () {
    await mkdirp(this.appiumHome); // ensure appium home exists
    try {
      this.yamlData = YAML.parse(await fs.readFile(this.configFile, 'utf8'));
      this.applySchemaMigrations();

      // set the list of drivers the user has installed
      this.installedExtensions = this.validate(this.yamlData[this.configKey]);
    } catch (err) {
      if (await fs.exists(this.configFile)) {
        // if the file exists and we couldn't parse it, that's a problem
        throw new Error(`Appium had trouble loading the extension installation ` +
                        `cache file (${this.configFile}). Ensure it exists and is ` +
                        `readable. Specific error: ${err.message}`);
      }

      // if the config file doesn't exist, try to write an empty one, to make
      // sure we actually have write privileges, and complain if we don't
      try {
        await this.write();
      } catch {
        throw new Error(`Appium could not read or write from the Appium Home directory ` +
                        `(${this.appiumHome}). Please ensure it is writable.`);
      }
    }
    return this.installedExtensions;
  }


  async write () {
    const newYamlData = {
      ...this.yamlData,
      schemaRev: CONFIG_SCHEMA_REV,
      [this.configKey]: this.installedExtensions
    };
    await fs.writeFile(this.configFile, YAML.stringify(newYamlData), 'utf8');
  }

  async addExtension (extName, extData) {
    this.installedExtensions[extName] = extData;
    await this.write();
  }

  async updateExtension (extName, extData) {
    this.installedExtensions[extName] = {
      ...this.installedExtensions[extName],
      ...extData,
    };
    await this.write();
  }

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

  extensionDesc () {
    throw new Error('This must be implemented in a final class');
  }

  getExtensionRequirePath (extName) {
    const {pkgName, installPath} = this.installedExtensions[extName];
    return path.resolve(this.appiumHome, installPath, 'node_modules', pkgName);
  }

  getInstallPath (extName) {
    const {installPath} = this.installedExtensions[extName];
    return path.resolve(this.appiumHome, installPath);
  }

  require (extName) {
    const {mainClass} = this.installedExtensions[extName];
    return require(this.getExtensionRequirePath(extName))[mainClass];
  }

  isInstalled (extName) {
    return _.includes(Object.keys(this.installedExtensions), extName);
  }
}

export {
  INSTALL_TYPE_NPM, INSTALL_TYPE_GIT, INSTALL_TYPE_LOCAL, INSTALL_TYPE_GITHUB,
  INSTALL_TYPES, DEFAULT_APPIUM_HOME, DRIVER_TYPE, PLUGIN_TYPE,
};

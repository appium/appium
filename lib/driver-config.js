import _ from 'lodash';
import log from './logger';
import { fs, mkdirp } from 'appium-support';
import path from 'path';
import YAML from 'yaml';

const CONFIG_FILE_NAME = 'drivers.yaml';
const CONFIG_SCHEMA_REV = 1;

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


export default class DriverConfig {
  constructor (appiumHome, logFn = log.error) {
    this.appiumHome = appiumHome;
    this.configFile = path.resolve(this.appiumHome, CONFIG_FILE_NAME);
    this.installedDrivers = {};
    this.log = logFn;
  }

  async read () {
    await mkdirp(this.appiumHome); // ensure appium home exists
    try {
      const yamlData = YAML.parse(await fs.readFile(this.configFile, 'utf8'));
      // in the future if we need to do anything specific based on schema
      // revision, we can check it as follows
      //   const schemaRev = yamlData.schemaRev;

      // set the list of drivers the user has installed
      this.installedDrivers = this.validate(yamlData.drivers);
    } catch (err) {
      if (await fs.exists(this.configFile)) {
        // if the file exists and we couldn't parse it, that's a problem
        throw new Error(`Appium had trouble loading the driver installation ` +
                        `cache file (${this.configFile}). Ensure it exists and is ` +
                        `readable. Specific error: ${err.message}`);
      }
      if (!await fs.access(this.appiumHome)) {
        // if appium home exists but the dir is not readable/writable
        throw new Error(`Appium could not read or write from the Appium Home directory ` +
                        `(${this.appiumHome}). Please ensure it is writable.`);
      }
    }
    return this.installedDrivers;
  }

  validate (drivers) {
    const automationNames = [];
    const foundProblems = {};
    for (const [driverName, {
      platformNames,
      automationName,
      version,
      pkgName,
      installSpec,
      installType,
      installPath,
      mainClass
    }] of _.toPairs(drivers)) {
      const p = foundProblems[driverName] = []; // just a little alias for convenience

      if (!_.isArray(platformNames)) {
        p.push({
          err: 'Missing or incorrect supported platformName list.',
          val: platformNames
        });
      } else {
        for (const pName of platformNames) {
          if (!_.isString(pName)) {
            p.push({err: 'Incorrectly formatted platformName.', val: pName});
          }
        }
      }

      if (!_.isString(automationName)) {
        p.push({err: 'Missing or incorrect automationName', val: automationName});
      }

      if (_.includes(automationNames, automationName)) {
        p.push({
          err: 'Multiple drivers claim support for the same automationName',
          val: automationName
        });
      }
      automationNames.push(automationName);

      if (!_.isString(version)) {
        p.push({err: 'Missing or incorrect version', val: version});
      }

      if (!_.isString(pkgName)) {
        p.push({err: 'Missing or incorrect NPM package name', val: pkgName});
      }

      if (!_.isString(installSpec)) {
        p.push({err: 'Missing or incorrect installation spec', val: installSpec});
      }

      if (!_.includes(INSTALL_TYPES, installType)) {
        p.push({err: 'Missing or incorrect install type', val: installType});
      }

      if (!_.isString(installPath)) {
        p.push({err: 'Missing or incorrect installation path', val: installPath});
      }

      if (!_.isString(mainClass)) {
        p.push({err: 'Missing or incorrect driver class name', val: mainClass});
      }
    }

    const problemSummaries = [];
    for (const [driverName, problems] of _.toPairs(foundProblems)) {
      if (_.isEmpty(problems)) {
        continue;
      }
      // remove this driver from the list since it's not valid
      delete drivers[driverName];
      problemSummaries.push(`Driver ${driverName} had errors and will not ` +
                            `be available. Errors:`);
      for (const problem of problems) {
        problemSummaries.push(`  - ${problem.err} (Actual value: ` +
                              `${JSON.stringify(problem.val)})`);
      }
    }

    if (!_.isEmpty(problemSummaries)) {
      this.log(`Appium encountered one or more errors while validating ` +
               `the drivers file (${this.configFile}):`);
      for (const summary of problemSummaries) {
        this.log(summary);
      }
    }

    return drivers;
  }

  async write () {
    const yamlData = {schemaRev: CONFIG_SCHEMA_REV, drivers: this.installedDrivers};
    await fs.writeFile(this.configFile, YAML.stringify(yamlData), 'utf8');
  }

  async addDriver (driverName, driverData) {
    this.installedDrivers[driverName] = driverData;
    await this.write();
  }

  async removeDriver (driverName) {
    delete this.installedDrivers[driverName];
    await this.write();
  }

  print () {
    const driverNames = Object.keys(this.installedDrivers);
    if (_.isEmpty(driverNames)) {
      log.info('No drivers have been installed. Use the "appium driver" ' +
               'command to install the one(s) you want to use.');
      return;
    }

    log.info('Available drivers:');
    for (const [driverName, {version, automationName}] of _.toPairs(this.installedDrivers)) {
      log.info(`  - ${driverName}@${version} (automationName '${automationName}')`);
    }
  }

  getDriverRequirePath (driverName) {
    const {pkgName, installPath} = this.installedDrivers[driverName];
    return path.resolve(this.appiumHome, installPath, 'node_modules', pkgName);
  }

  getInstallPath (driverName) {
    const {installPath} = this.installedDrivers[driverName];
    return path.resolve(this.appiumHome, installPath);
  }

  require (driverName) {
    const {mainClass} = this.installedDrivers[driverName];
    return require(this.getDriverRequirePath(driverName))[mainClass];
  }

  isInstalled (driverName) {
    return _.includes(Object.keys(this.installedDrivers), driverName);
  }
}

export {
  INSTALL_TYPE_NPM, INSTALL_TYPE_GIT, INSTALL_TYPE_LOCAL, INSTALL_TYPE_GITHUB,
  INSTALL_TYPES
};

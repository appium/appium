/* eslint-disable no-console */

import _ from 'lodash';
import NPM from './npm';
import path from 'path';
import { fs, util } from '@appium/support';
import { log, spinWith, RingBuffer } from './utils';
import { SubProcess} from 'teen_process';
import { INSTALL_TYPE_NPM, INSTALL_TYPE_GIT, INSTALL_TYPE_GITHUB,
         INSTALL_TYPE_LOCAL } from '../extension-config';

const UPDATE_ALL = 'installed';

class NotUpdatableError extends Error {}
class NoUpdatesAvailableError extends Error {}

export default class ExtensionCommand {

  /**
   * @typedef {Object} ExtensionCommandConstructor
   * @property {Object} config - the DriverConfig or PluginConfig object used for this command
   * @property {boolean} json - whether the output of this command should be JSON or text
   * @property {string} type - DRIVER_TYPE or PLUGIN_TYPE
   */

  /**
   * Build an ExtensionCommand
   *
   * @param {ExtensionCommandConstructor} opts
   * @return {ExtensionCommand}
   */
  constructor ({config, json, type}) {
    this.config = config;
    this.type = type;
    this.isJsonOutput = json;
    this.npm = new NPM(this.config.appiumHome);
    this.knownExtensions = {}; // this needs to be overridden in final class
  }

  /**
   * Take a CLI parse and run an extension command based on its type
   *
   * @param {object} args - a key/value object with CLI flags and values
   * @return {object} the result of the specific command which is executed
   */
  async execute (args) {
    const cmd = args[`${this.type}Command`];
    if (!_.isFunction(ExtensionCommand.prototype[cmd])) {
      throw new Error(`Cannot handle ${this.type} command ${cmd}`);
    }
    const executeCmd = this[cmd].bind(this);
    return await executeCmd(args);
  }

  /**
   * @typedef {Object} ListArgs
   * @property {boolean} showInstalled - whether should show only installed extensions
   * @property {boolean} showUpdates - whether should show available updates
   */

  /**
   * List extensions
   *
   * @param {ListArgs} args
   * @return {object} map of extension names to extension data
   */
  async list ({showInstalled, showUpdates}) {
    const lsMsg = `Listing ${showInstalled ? 'installed' : 'available'} ${this.type}s`;
    const installedNames = Object.keys(this.config.installedExtensions);
    const knownNames = Object.keys(this.knownExtensions);
    const exts = [...installedNames, ...knownNames].reduce((acc, name) => {
      if (!acc[name]) {
        if (installedNames.includes(name)) {
          acc[name] = {...this.config.installedExtensions[name], installed: true};
        } else if (!showInstalled) {
          acc[name] = {pkgName: this.knownExtensions[name], installed: false};
        }
      }
      return acc;
    }, {});

    // if we want to show whether updates are available, put that behind a spinner
    await spinWith(this.isJsonOutput, lsMsg, async () => {
      if (!showUpdates) {
        return;
      }
      for (const [ext, data] of _.toPairs(exts)) {
        const {installed, installType} = data;
        if (!installed || installType !== INSTALL_TYPE_NPM) {
          // don't need to check for updates on exts that aren't installed
          // also don't need to check for updates on non-npm exts
          continue;
        }
        const updates = await this.checkForExtensionUpdate(ext);
        data.updateVersion = updates.safeUpdate;
        data.unsafeUpdateVersion = updates.unsafeUpdate;
        data.upToDate = updates.safeUpdate === null && updates.unsafeUpdate === null;
      }
    });

    // if we're just getting the data, short circuit return here since we don't need to do any
    // formatting logic
    if (this.isJsonOutput) {
      return exts;
    }

    for (const [
      name,
      {installType, installSpec, installed, updateVersion, unsafeUpdateVersion, version, upToDate}
    ] of _.toPairs(exts)) {
      let typeTxt;
      switch (installType) {
        case INSTALL_TYPE_GIT:
        case INSTALL_TYPE_GITHUB:
          typeTxt = `(cloned from ${installSpec})`.yellow;
          break;
        case INSTALL_TYPE_LOCAL:
          typeTxt = `(linked from ${installSpec})`.magenta;
          break;
        default:
          typeTxt = '(NPM)';
      }
      const installTxt = installed ?
        `@${version.yellow} ${('[installed ' + typeTxt + ']').green}` :
        ' [not installed]'.grey;
      const updateTxt = showUpdates && updateVersion ?
        ` [${updateVersion} available]`.magenta :
        '';
      const upToDateTxt = showUpdates && upToDate ?
        ` [Up to date]`.green :
        '';
      const unsafeUpdateTxt = showUpdates && unsafeUpdateVersion ?
        ` [${unsafeUpdateVersion} available (potentially unsafe)]`.cyan :
        '';

      console.log(`- ${name.yellow}${installTxt}${updateTxt}${upToDateTxt}${unsafeUpdateTxt}`);
    }

    return exts;
  }

  /**
   * @typedef {Object} InstallArgs
   * @property {string} ext - the name or spec of an extension to install
   * @property {string} installType - how to install this extension. One of the INSTALL_TYPES
   * @property {string} [packageName] - for git/github installs, the extension node package name
   */

  /**
   * Install an extension
   *
   * @param {InstallArgs} args
   * @return {object} map of all installed extension names to extension data
   */
  async install ({ext, installType, packageName}) {
    log(this.isJsonOutput, `Attempting to find and install ${this.type} '${ext}'`);

    let extData;
    let installSpec = ext;

    if (packageName && [INSTALL_TYPE_LOCAL, INSTALL_TYPE_NPM].includes(installType)) {
      throw new Error(`When using --source=${installType}, cannot also use --package`);
    }

    if (!packageName && [INSTALL_TYPE_GIT, INSTALL_TYPE_GITHUB].includes(installType)) {
      throw new Error(`When using --source=${installType}, must also use --package`);
    }

    if (installType === INSTALL_TYPE_LOCAL) {
      const msg = `Linking ${this.type} from local path`;
      const pkgJsonData = await spinWith(this.isJsonOutput, msg, async () => (
        await this.npm.linkPackage(installSpec))
      );
      extData = this.getExtensionFields(pkgJsonData);
      extData.installPath = extData.pkgName;
    } else if (installType === INSTALL_TYPE_GITHUB) {
      if (installSpec.split('/').length !== 2) {
        throw new Error(`Github ${this.type} spec ${installSpec} appeared to be invalid; ` +
                        'it should be of the form <org>/<repo>');
      }
      extData = await this.installViaNpm({ext: installSpec, pkgName: packageName});
    } else if (installType === INSTALL_TYPE_GIT) {
      // git urls can have '.git' at the end, but this is not necessary and would complicate the
      // way we download and name directories, so we can just remove it
      installSpec = installSpec.replace(/\.git$/, '');
      extData = await this.installViaNpm({ext: installSpec, pkgName: packageName});
    } else {
      // at this point we have either an npm package or an appium verified extension
      // name. both of which will be installed via npm.
      // extensions installed via npm can include versions or tags after the '@'
      // sign, so check for that. We also need to be careful that package names themselves can
      // contain the '@' symbol, as in `npm install @appium/fake-driver@1.2.0`
      let name, pkgVer;
      const splits = installSpec.split('@');
      if (installSpec[0] === '@') {
        // this is the case where we have an npm org included in the package name
        [name, pkgVer] = [`@${splits[1]}`, splits[2]];
      } else {
        // this is the case without an npm org
        [name, pkgVer] = splits;
      }
      let pkgName;

      if (installType === INSTALL_TYPE_NPM) {
        // if we're installing a named package from npm, we don't need to check
        // against the appium extension list; just use the installSpec as is
        pkgName = name;
      } else {
        // if we're installing a named appium driver (like 'xcuitest') we need to
        // dereference the actual npm package ('appiupm-xcuitest-driver'), so
        // check it exists and get the correct package
        const knownNames = Object.keys(this.knownExtensions);
        if (!_.includes(knownNames, name)) {
          const msg = `Could not resolve ${this.type}; are you sure it's in the list ` +
                      `of supported ${this.type}s? ${JSON.stringify(knownNames)}`;
          throw new Error(msg);
        }
        pkgName = this.knownExtensions[name];
        // given that we'll use the install type in the driver json, store it as
        // 'npm' now
        installType = INSTALL_TYPE_NPM;
      }

      extData = await this.installViaNpm({ext, pkgName, pkgVer});
    }

    const extName = extData[`${this.type}Name`];
    delete extData[`${this.type}Name`];

    if (this.config.isInstalled(extName)) {
      throw new Error(`A ${this.type} named '${extName}' is already installed. ` +
                      `Did you mean to update? 'appium ${this.type} update'. See ` +
                      `installed ${this.type}s with 'appium ${this.type} list --installed'.`);
    }

    extData.installType = installType;
    extData.installSpec = installSpec;
    await this.config.addExtension(extName, extData);

    // log info for the user
    log(this.isJsonOutput, this.getPostInstallText({extName, extData}));

    return this.config.installedExtensions;
  }

  /**
   * @typedef {Object} InstallViaNpmArgs
   * @property {string} ext - the name or spec of an extension to install
   * @property {string} pkgName - the NPM package name of the extension
   * @property {string} [pkgVer] - the specific version of the NPM package
   */

  /**
   * Install an extension via NPM
   *
   * @param {InstallViaNpmArgs} args
   */
  async installViaNpm ({ext, pkgName, pkgVer}) {
    const npmSpec = `${pkgName}${pkgVer ? '@' + pkgVer : ''}`;
    const specMsg = npmSpec === ext ? '' : ` using NPM install spec '${npmSpec}'`;
    const msg = `Installing '${ext}'${specMsg}`;
    try {
      const pkgJsonData = await spinWith(this.isJsonOutput, msg, async () => (
        await this.npm.installPackage({
          pkgDir: path.resolve(this.config.appiumHome, pkgName),
          pkgName,
          pkgVer
        })
      ));
      const extData = this.getExtensionFields(pkgJsonData);
      extData.installPath = pkgName;
      return extData;
    } catch (err) {
      throw new Error(`Encountered an error when installing package: ${err.message}`);
    }
  }

  /**
   * @typedef {Object} ExtensionArgs
   * @property {string} extName - the name of an extension
   * @property {object} extData - the data for an installed extension
   */

  /**
   * Get the text which should be displayed to the user after an extension has been installed. This
   * is designed to be overridden by drivers/plugins with their own particular text.
   *
   * @param {ExtensionArgs} args
   */
  getPostInstallText (/*{extName, extData}*/) {
    throw new Error('Must be implemented in final class');
  }

  /**
   * Take an NPM module's package.json and extract Appium driver information from a special
   * 'appium' field in the JSON data. We need this information to e.g. determine which class to
   * load as the main driver class, or to be able to detect incompatibilities between driver and
   * appium versions.
   *
   * @param {object} pkgJsonData - the package.json data for a driver module, as if it had been
   * straightforwardly 'require'd
   */
  getExtensionFields (pkgJsonData) {
    if (!pkgJsonData.appium) {
      throw new Error(`Installed driver did not have an 'appium' section in its ` +
                      `package.json file as expected`);
    }
    const {appium, name, version} = pkgJsonData;
    this.validateExtensionFields(appium);

    return {...appium, pkgName: name, version};
  }

  /**
   * For any package.json fields which a particular type of extension requires, validate the
   * presence and form of those fields on the package.json data, throwing an error if anything is
   * amiss.
   *
   * @param {object} appiumPkgData - the data in the "appium" field of package.json for an
   * extension
   */
  validateExtensionFields (/*appiumPkgData*/) {
    throw new Error('Must be implemented in final class');
  }

  /**
   * @typedef {Object} UninstallArgs
   * @property {string} ext - the name or spec of an extension to uninstall
   */

  /**
   * Uninstall an extension
   *
   * @param {UninstallArgs} args
   * @return {object} map of all installed extension names to extension data
   */
  async uninstall ({ext}) {
    if (!this.config.isInstalled(ext)) {
      throw new Error(`Can't uninstall ${this.type} '${ext}'; it is not installed`);
    }
    try {
      await fs.rimraf(this.config.getInstallPath(ext));
    } finally {
      await this.config.removeExtension(ext);
    }
    log(this.isJsonOutput, `Successfully uninstalled ${this.type} '${ext}'`.green);
    return this.config.installedExtensions;
  }

  /**
   * @typedef {Object} ExtensionUpdateOpts
   * @property {string} ext - the name of the extension to update
   * @property {boolean} unsafe - if true, will perform unsafe updates past major revision
   * boundaries
   */

  /**
   * @typedef {Object} UpdateReport
   * @property {string} from - version updated from
   * @property {string} to - version updated to
   */

  /**
   * @typedef {Object} ExtensionUpdateResult
   * @property {Object} errors - map of ext names to error objects
   * @property {Object} updates - map of ext names to {@link UpdateReport}s
   */

  /**
   * Attempt to update one or more drivers using NPM
   *
   * @param {ExtensionUpdateOpts} updateSpec
   * @return {ExtensionUpdateResult}
   */
  async update ({ext, unsafe}) {
    const shouldUpdateAll = ext === UPDATE_ALL;
    // if we're specifically requesting an update for an extension, make sure it's installed
    if (!shouldUpdateAll && !this.config.isInstalled(ext)) {
      throw new Error(`The ${this.type} '${ext}' was not installed, so can't be updated`);
    }
    const extsToUpdate = shouldUpdateAll ? Object.keys(this.config.installedExtensions) : [ext];

    // 'errors' will have ext names as keys and error objects as values
    const errors = {};

    // 'updates' will have ext names as keys and update objects as values, where an update
    // object is of the form {from: versionString, to: versionString}
    const updates = {};

    for (const e of extsToUpdate) {
      try {
        await spinWith(this.isJsonOutput, `Checking if ${this.type} '${e}' is updatable`, () => {
          if (this.config.installedExtensions[e].installType !== INSTALL_TYPE_NPM) {
            throw new NotUpdatableError();
          }
        });
        const update = await spinWith(this.isJsonOutput, `Checking if ${this.type} '${e}' needs an update`, async () => {
          const update = await this.checkForExtensionUpdate(e);
          if (!(update.safeUpdate || update.unsafeUpdate)) {
            throw new NoUpdatesAvailableError();
          }
          return update;
        });
        if (!unsafe && !update.safeUpdate) {
          throw new Error(`The ${this.type} '${e}' has a major revision update ` +
                          `(${update.current} => ${update.unsafeUpdate}), which could include ` +
                          `breaking changes. If you want to apply this update, re-run with --unsafe`);
        }
        const updateVer = unsafe && update.unsafeUpdate ? update.unsafeUpdate : update.safeUpdate;
        await spinWith(
          this.isJsonOutput,
          `Updating driver '${e}' from ${update.current} to ${updateVer}`,
          async () => await this.updateExtension(e, updateVer)
        );
        updates[e] = {from: update.current, to: updateVer};
      } catch (err) {
        errors[e] = err;
      }
    }

    log(this.isJsonOutput, 'Update report:');
    for (const [e, update] of _.toPairs(updates)) {
      log(this.isJsonOutput, `- ${this.type} ${e} updated: ${update.from} => ${update.to}`.green);
    }
    for (const [e, err] of _.toPairs(errors)) {
      if (err instanceof NotUpdatableError) {
        log(this.isJsonOutput, `- '${e}' was not installed via npm, so we could not check ` +
                               `for updates`.yellow);
      } else if (err instanceof NoUpdatesAvailableError) {
        log(this.isJsonOutput, `- '${e}' had no updates available`.yellow);
      } else {
        // otherwise, make it pop with red!
        log(this.isJsonOutput, `- '${e}' failed to update: ${err}`.red);
      }
    }

    return {updates, errors};
  }

  /**
   * @typedef PossibleUpdates
   * @property {string} current - current version
   * @property {string|null} safeUpdate - version we can safely update to if it exists, or null
   * @property {string|null} unsafeUpdate - version we can unsafely update to if it exists, or null
   */

  /**
   * Given an extension name, figure out what its highest possible version upgrade is, and also the
   * highest possible safe upgrade.
   *
   * @param {string} ext - name of extension
   * @return {PossibleUpdates}
   */
  async checkForExtensionUpdate (ext) {
    // TODO decide how we want to handle beta versions?
    // this is a helper method, 'ext' is assumed to already be installed here, and of the npm
    // install type
    const {version, pkgName} = this.config.installedExtensions[ext];
    let unsafeUpdate = await this.npm.getLatestVersion(pkgName);
    let safeUpdate = await this.npm.getLatestSafeUpgradeVersion(pkgName, version);
    if (!util.compareVersions(unsafeUpdate, '>', version)) {
      // the latest version is not greater than the current version, so there's no possible update
      unsafeUpdate = null;
      safeUpdate = null;
    }
    if (unsafeUpdate && unsafeUpdate === safeUpdate) {
      // the latest update is the same as the safe update, which means it's not actually unsafe
      unsafeUpdate = null;
    }
    if (safeUpdate && !util.compareVersions(safeUpdate, '>', version)) {
      // even the safe update is not later than the current, so it is not actually an update
      safeUpdate = null;
    }
    return {current: version, safeUpdate, unsafeUpdate};
  }

  /**
   * Actually update an extension installed by NPM, using the NPM cli. And update the installation
   * manifest.
   *
   * @param {string} ext - name of extension to update
   * @param {string} version - version string identifier to update extension to
   */
  async updateExtension (ext, version) {
    const {pkgName} = this.config.installedExtensions[ext];
    await fs.rimraf(this.config.getInstallPath(ext));
    const extData = await this.installViaNpm({ext, pkgName, pkgVer: version});
    delete extData[`${this.type}Name`];
    await this.config.updateExtension(ext, extData);
  }

  /**
   * Runs a script cached inside the "scripts" field under "appium"
   * inside of the driver/plugins "package.json" file. Will throw
   * an error if the driver/plugin does not contain a "scripts" field
   * underneath the "appium" field in its package.json, if the
   * "scripts" field is not a plain object, or if the scriptName is
   * not found within "scripts" object.
   *
   * @param {string} ext - name of the extension to run a script from
   * @param {string} scriptName - name of the script to run
   * @return {RunOutput}
   */
  async run ({ext, scriptName}) {
    if (!_.has(this.config.installedExtensions, ext)) {
      throw new Error(`please install the ${this.type} first`);
    }

    const extConfig = this.config.installedExtensions[ext];

    if (!_.has(extConfig, 'scripts')) {
      throw new Error(`The ${this.type} named '${ext}' does not contain the ` +
                      `"scripts" field underneath the "appium" field in its package.json`);
    }

    const extScripts = extConfig.scripts;

    if (!_.isPlainObject(extScripts)) {
      throw new Error(`The ${this.type} named '${ext}' "scripts" field must be a plain object`);
    }

    if (!_.has(extScripts, scriptName)) {
      throw new Error(`The ${this.type} named '${ext}' does not support the script: '${scriptName}'`);
    }

    const runner = new SubProcess(process.execPath, [extScripts[scriptName]], {
      cwd: this.config.getExtensionRequirePath(ext)
    });

    const output = new RingBuffer(50);

    runner.on('stream-line', (line) => {
      output.enqueue(line);
      log(this.isJsonOutput, line);
    });

    await runner.start(0);

    try {
      await runner.join();
      log(this.isJsonOutput, `${scriptName} successfully ran`.green);
      return {output: output.getBuff()};
    } catch (err) {
      log(this.isJsonOutput, `Encountered an error when running '${scriptName}': ${err.message}`.red);
      return {error: err.message, output: output.getBuff()};
    }
  }
}

/**
 * @typedef {Object} RunOutput
 * @property {string|undefined} error - error message if script ran unsuccessfully, otherwise undefined
 * @property {string[]} output - script output
 */

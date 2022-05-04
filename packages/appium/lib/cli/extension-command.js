/* eslint-disable no-console */

import _ from 'lodash';
import path from 'path';
import {npm, fs, util, env} from '@appium/support';
import {log, spinWith, RingBuffer} from './utils';
import {SubProcess} from 'teen_process';
import {
  INSTALL_TYPE_NPM,
  INSTALL_TYPE_GIT,
  INSTALL_TYPE_GITHUB,
  INSTALL_TYPE_LOCAL,
} from '../extension/extension-config';
import {packageDidChange} from '../extension/package-changed';

const UPDATE_ALL = 'installed';

class NotUpdatableError extends Error {}
class NoUpdatesAvailableError extends Error {}

/**
 * @template {ExtensionType} ExtType
 */
class ExtensionCommand {
  /**
   * This is the `DriverConfig` or `PluginConfig`, depending on `ExtType`.
   * @type {ExtensionConfig<ExtType>}
   */
  config;

  /**
   * {@linkcode Record} of official plugins or drivers.
   * @type {KnownExtensions<ExtType>}
   */
  knownExtensions;

  /**
   * If `true`, command output has been requested as JSON.
   * @type {boolean}
   */
  isJsonOutput;

  /**
   * Build an ExtensionCommand
   * @param {ExtensionCommandOptions<ExtType>} opts
   */
  constructor({config, json}) {
    this.config = config;
    this.isJsonOutput = json;
  }

  /**
   * `driver` or `plugin`, depending on the `ExtensionConfig`.
   */
  get type() {
    return this.config.extensionType;
  }

  /**
   * Take a CLI parse and run an extension command based on its type
   *
   * @param {object} args - a key/value object with CLI flags and values
   * @return {Promise<object>} the result of the specific command which is executed
   */
  async execute(args) {
    const cmd = args[`${this.type}Command`];
    if (!_.isFunction(this[cmd])) {
      throw new Error(`Cannot handle ${this.type} command ${cmd}`);
    }
    const executeCmd = this[cmd].bind(this);
    return await executeCmd(args);
  }

  /**
   * @typedef ListOptions
   * @property {boolean} showInstalled - whether should show only installed extensions
   * @property {boolean} showUpdates - whether should show available updates
   */

  /**
   * List extensions
   *
   * @param {ListOptions} opts
   * @return {Promise<ExtensionListData>} map of extension names to extension data
   */
  async list({showInstalled, showUpdates}) {
    const lsMsg = `Listing ${showInstalled ? 'installed' : 'available'} ${this.type}s`;
    const installedNames = Object.keys(this.config.installedExtensions);
    const knownNames = Object.keys(this.knownExtensions);
    const exts = [...installedNames, ...knownNames].reduce(
      (acc, name) => {
        if (!acc[name]) {
          if (installedNames.includes(name)) {
            acc[name] = {
              ...this.config.installedExtensions[name],
              installed: true,
            };
          } else if (!showInstalled) {
            acc[name] = {pkgName: this.knownExtensions[name], installed: false};
          }
        }
        return acc;
      },
      /**
       * This accumulator contains either {@linkcode UninstalledExtensionLIstData} _or_
       * {@linkcode InstalledExtensionListData} without upgrade information (which is added by the below code block)
       * @type {Record<string,Partial<InstalledExtensionListData>|UninstalledExtensionListData>}
       */ ({})
    );

    // if we want to show whether updates are available, put that behind a spinner
    await spinWith(this.isJsonOutput, lsMsg, async () => {
      if (!showUpdates) {
        return;
      }
      for (const [ext, data] of _.toPairs(exts)) {
        if (!data.installed || data.installType !== INSTALL_TYPE_NPM) {
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

    const listData = /** @type {ExtensionListData} */ (exts);

    // if we're just getting the data, short circuit return here since we don't need to do any
    // formatting logic
    if (this.isJsonOutput) {
      return listData;
    }

    for (const [name, data] of _.toPairs(listData)) {
      let installTxt = ' [not installed]'.grey;
      let updateTxt = '';
      let upToDateTxt = '';
      let unsafeUpdateTxt = '';
      if (data.installed) {
        const {installType, installSpec, updateVersion, unsafeUpdateVersion, version, upToDate} =
          data;
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
        installTxt = `@${version.yellow} ${('[installed ' + typeTxt + ']').green}`;

        if (showUpdates) {
          if (updateVersion) {
            updateTxt = ` [${updateVersion} available]`.magenta;
          }
          if (upToDate) {
            upToDateTxt = ` [Up to date]`.green;
          }
          if (unsafeUpdateVersion) {
            unsafeUpdateTxt = ` [${unsafeUpdateVersion} available (potentially unsafe)]`.cyan;
          }
        }
      }

      console.log(`- ${name.yellow}${installTxt}${updateTxt}${upToDateTxt}${unsafeUpdateTxt}`);
    }

    return listData;
  }

  /**
   * Install an extension
   *
   * @param {InstallArgs} args
   * @return {Promise<ExtRecord<ExtType>>} map of all installed extension names to extension data
   */
  async _install({installSpec, installType, packageName}) {
    /** @type {ExtensionFields<typeof this.type>} */
    let extData;

    if (packageName && [INSTALL_TYPE_LOCAL, INSTALL_TYPE_NPM].includes(installType)) {
      throw new Error(`When using --source=${installType}, cannot also use --package`);
    }

    if (!packageName && [INSTALL_TYPE_GIT, INSTALL_TYPE_GITHUB].includes(installType)) {
      throw new Error(`When using --source=${installType}, must also use --package`);
    }

    if (installType === INSTALL_TYPE_GITHUB) {
      if (installSpec.split('/').length !== 2) {
        throw new Error(
          `Github ${this.type} spec ${installSpec} appeared to be invalid; ` +
            'it should be of the form <org>/<repo>'
        );
      }
      extData = await this.installViaNpm({
        installSpec,
        pkgName: /** @type {string} */ (packageName),
      });
    } else if (installType === INSTALL_TYPE_GIT) {
      // git urls can have '.git' at the end, but this is not necessary and would complicate the
      // way we download and name directories, so we can just remove it
      installSpec = installSpec.replace(/\.git$/, '');
      extData = await this.installViaNpm({
        installSpec,
        pkgName: /** @type {string} */ (packageName),
      });
    } else {
      let pkgName, pkgVer;
      if (installType === INSTALL_TYPE_LOCAL) {
        pkgName = path.isAbsolute(installSpec) ? installSpec : path.resolve(installSpec);
      } else {
        // at this point we have either an npm package or an appium verified extension
        // name or a local path. both of which will be installed via npm.
        // extensions installed via npm can include versions or tags after the '@'
        // sign, so check for that. We also need to be careful that package names themselves can
        // contain the '@' symbol, as in `npm install @appium/fake-driver@1.2.0`
        let name;
        const splits = installSpec.split('@');
        if (installSpec[0] === '@') {
          // this is the case where we have an npm org included in the package name
          [name, pkgVer] = [`@${splits[1]}`, splits[2]];
        } else {
          // this is the case without an npm org
          [name, pkgVer] = splits;
        }

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
            const msg =
              `Could not resolve ${this.type}; are you sure it's in the list ` +
              `of supported ${this.type}s? ${JSON.stringify(knownNames)}`;
            throw new Error(msg);
          }
          pkgName = this.knownExtensions[name];
          // given that we'll use the install type in the driver json, store it as
          // 'npm' now
          installType = INSTALL_TYPE_NPM;
        }
      }

      extData = await this.installViaNpm({installSpec, pkgName, pkgVer});
    }

    const extName = extData[/** @type {string} */ (`${this.type}Name`)];
    delete extData[/** @type {string} */ (`${this.type}Name`)];

    if (this.config.isInstalled(extName)) {
      throw new Error(
        `A ${this.type} named '${extName}' is already installed. ` +
          `Did you mean to update? 'appium ${this.type} update'. See ` +
          `installed ${this.type}s with 'appium ${this.type} list --installed'.`
      );
    }

    const extManifest = {...extData, installType, installSpec};
    await this.config.addExtension(extName, extManifest);

    // update the if we've changed the local `package.json`
    if (await env.hasAppiumDependency(this.config.appiumHome)) {
      await packageDidChange(this.config.appiumHome);
    }

    // log info for the user
    log(this.isJsonOutput, this.getPostInstallText({extName, extData}));

    return this.config.installedExtensions;
  }

  /**
   * Install an extension via NPM
   *
   * @param {InstallViaNpmArgs} args
   */
  async installViaNpm({installSpec, pkgName, pkgVer}) {
    const npmSpec = `${pkgName}${pkgVer ? '@' + pkgVer : ''}`;
    const specMsg = npmSpec === installSpec ? '' : ` using NPM install spec '${npmSpec}'`;
    const msg = `Installing '${installSpec}'${specMsg}`;
    try {
      const pkgJsonData = await spinWith(
        this.isJsonOutput,
        msg,
        async () =>
          await npm.installPackage(this.config.appiumHome, pkgName, {
            pkgVer,
          })
      );
      return this.getExtensionFields(pkgJsonData, installSpec);
    } catch (err) {
      throw new Error(`Encountered an error when installing package: ${err.message}`);
    }
  }

  /**
   * Get the text which should be displayed to the user after an extension has been installed. This
   * is designed to be overridden by drivers/plugins with their own particular text.
   *
   * @param {ExtensionArgs} args
   * @returns {string}
   */
  // eslint-disable-next-line no-unused-vars
  getPostInstallText(args) {
    throw new Error('Must be implemented in final class');
  }

  /**
   * Take an NPM module's package.json and extract Appium driver information from a special
   * 'appium' field in the JSON data. We need this information to e.g. determine which class to
   * load as the main driver class, or to be able to detect incompatibilities between driver and
   * appium versions.
   *
   * @param {ExtPackageJson<ExtType>} pkgJson - the package.json data for a driver module, as if it had been straightforwardly 'require'd
   * @param {string} installSpec - Extension name/spec
   * @returns {ExtensionFields<ExtType>}
   */
  getExtensionFields(pkgJson, installSpec) {
    this.validatePackageJson(pkgJson, installSpec);
    const {appium, name, version, peerDependencies} = pkgJson;

    /** @type {unknown} */
    const result = {
      ...appium,
      pkgName: name,
      version,
      appiumVersion: peerDependencies?.appium,
    };
    return /** @type {ExtensionFields<ExtType>} */ (result);
  }

  /**
   * Validates the _required_ root fields of an extension's `package.json` file.
   *
   * These required fields are:
   * - `name`
   * - `version`
   * - `appium`
   * @param {import('type-fest').PackageJson} pkgJson - `package.json` of extension
   * @param {string} installSpec - Extension name/spec
   * @throws {ReferenceError} If `package.json` has a missing or invalid field
   * @returns {pkgJson is ExtPackageJson<ExtType>}
   */
  validatePackageJson(pkgJson, installSpec) {
    const {appium, name, version} = /** @type {ExtPackageJson<ExtType>} */ (pkgJson);

    /**
     *
     * @param {string} field
     * @returns {ReferenceError}
     */
    const createMissingFieldError = (field) =>
      new ReferenceError(
        `${this.type} "${installSpec}" invalid; missing a \`${field}\` field of its \`package.json\``
      );

    if (!name) {
      throw createMissingFieldError('name');
    }
    if (!version) {
      throw createMissingFieldError('version');
    }
    if (!appium) {
      throw createMissingFieldError('appium');
    }

    this.validateExtensionFields(appium, installSpec);

    return true;
  }

  /**
   * For any `package.json` fields which a particular type of extension requires, validate the
   * presence and form of those fields on the `package.json` data, throwing an error if anything is
   * amiss.
   *
   * @param {ExtMetadata<ExtType>} extMetadata - the data in the "appium" field of `package.json` for an extension
   * @param {string} installSpec - Extension name/spec
   */
  // eslint-disable-next-line no-unused-vars
  validateExtensionFields(extMetadata, installSpec) {
    throw new Error('Must be implemented in final class');
  }

  /**
   * Uninstall an extension
   *
   * @param {UninstallOpts} opts
   * @return {Promise<ExtRecord<ExtType>>} map of all installed extension names to extension data
   */
  async _uninstall({installSpec}) {
    if (!this.config.isInstalled(installSpec)) {
      throw new Error(`Can't uninstall ${this.type} '${installSpec}'; it is not installed`);
    }
    const installPath = this.config.getInstallPath(installSpec);
    try {
      await fs.rimraf(installPath);
    } finally {
      await this.config.removeExtension(installSpec);
    }
    log(this.isJsonOutput, `Successfully uninstalled ${this.type} '${installSpec}'`.green);
    return this.config.installedExtensions;
  }

  /**
   * Attempt to update one or more drivers using NPM
   *
   * @param {ExtensionUpdateOpts} updateSpec
   * @return {Promise<ExtensionUpdateResult>}
   */
  async _update({installSpec, unsafe}) {
    const shouldUpdateAll = installSpec === UPDATE_ALL;
    // if we're specifically requesting an update for an extension, make sure it's installed
    if (!shouldUpdateAll && !this.config.isInstalled(installSpec)) {
      throw new Error(`The ${this.type} '${installSpec}' was not installed, so can't be updated`);
    }
    const extsToUpdate = shouldUpdateAll
      ? Object.keys(this.config.installedExtensions)
      : [installSpec];

    // 'errors' will have ext names as keys and error objects as values
    /** @type {Record<string,Error>} */
    const errors = {};

    // 'updates' will have ext names as keys and update objects as values, where an update
    // object is of the form {from: versionString, to: versionString}
    /** @type {Record<string,UpdateReport>} */
    const updates = {};

    for (const e of extsToUpdate) {
      try {
        await spinWith(this.isJsonOutput, `Checking if ${this.type} '${e}' is updatable`, () => {
          if (this.config.installedExtensions[e].installType !== INSTALL_TYPE_NPM) {
            throw new NotUpdatableError();
          }
        });
        const update = await spinWith(
          this.isJsonOutput,
          `Checking if ${this.type} '${e}' needs an update`,
          async () => {
            const update = await this.checkForExtensionUpdate(e);
            if (!(update.safeUpdate || update.unsafeUpdate)) {
              throw new NoUpdatesAvailableError();
            }
            return update;
          }
        );
        if (!unsafe && !update.safeUpdate) {
          throw new Error(
            `The ${this.type} '${e}' has a major revision update ` +
              `(${update.current} => ${update.unsafeUpdate}), which could include ` +
              `breaking changes. If you want to apply this update, re-run with --unsafe`
          );
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
        log(
          this.isJsonOutput,
          `- '${e}' was not installed via npm, so we could not check ` + `for updates`.yellow
        );
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
   * Given an extension name, figure out what its highest possible version upgrade is, and also the
   * highest possible safe upgrade.
   *
   * @param {string} ext - name of extension
   * @return {Promise<PossibleUpdates>}
   */
  async checkForExtensionUpdate(ext) {
    // TODO decide how we want to handle beta versions?
    // this is a helper method, 'ext' is assumed to already be installed here, and of the npm
    // install type
    const {version, pkgName} = this.config.installedExtensions[ext];
    let unsafeUpdate = await npm.getLatestVersion(this.config.appiumHome, pkgName);
    let safeUpdate = await npm.getLatestSafeUpgradeVersion(
      this.config.appiumHome,
      pkgName,
      version
    );
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
   * @param {string} installSpec - name of extension to update
   * @param {string} version - version string identifier to update extension to
   * @returns {Promise<void>}
   */
  async updateExtension(installSpec, version) {
    const {pkgName} = this.config.installedExtensions[installSpec];
    await fs.rimraf(this.config.getInstallPath(installSpec));
    const extData = await this.installViaNpm({
      installSpec,
      pkgName,
      pkgVer: version,
    });
    delete extData[/** @type {string} */ (`${this.type}Name`)];
    await this.config.updateExtension(installSpec, extData);
  }

  /**
   * Runs a script cached inside the "scripts" field under "appium"
   * inside of the driver/plugins "package.json" file. Will throw
   * an error if the driver/plugin does not contain a "scripts" field
   * underneath the "appium" field in its package.json, if the
   * "scripts" field is not a plain object, or if the scriptName is
   * not found within "scripts" object.
   *
   * @param {RunOptions} opts
   * @return {Promise<RunOutput>}
   */
  async _run({installSpec, scriptName}) {
    if (!_.has(this.config.installedExtensions, installSpec)) {
      throw new Error(`please install the ${this.type} first`);
    }

    const extConfig = this.config.installedExtensions[installSpec];

    // note: TS cannot understand that _.has() is a type guard
    if (!extConfig.scripts) {
      throw new Error(
        `The ${this.type} named '${installSpec}' does not contain the ` +
          `"scripts" field underneath the "appium" field in its package.json`
      );
    }

    const extScripts = extConfig.scripts;

    if (!_.isPlainObject(extScripts)) {
      throw new Error(
        `The ${this.type} named '${installSpec}' "scripts" field must be a plain object`
      );
    }

    if (!_.has(extScripts, scriptName)) {
      throw new Error(
        `The ${this.type} named '${installSpec}' does not support the script: '${scriptName}'`
      );
    }

    const runner = new SubProcess(process.execPath, [extScripts[scriptName]], {
      cwd: this.config.getInstallPath(installSpec),
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
      log(
        this.isJsonOutput,
        `Encountered an error when running '${scriptName}': ${err.message}`.red
      );
      return {error: err.message, output: output.getBuff()};
    }
  }
}

export default ExtensionCommand;
export {ExtensionCommand};

/**
 * Options for the {@linkcode ExtensionCommand} constructor
 * @template {ExtensionType} ExtType
 * @typedef ExtensionCommandOptions
 * @property {ExtensionConfig<ExtType>} config - the `DriverConfig` or `PluginConfig` instance used for this command
 * @property {boolean} json - whether the output of this command should be JSON or text
 */

/**
 * Extra stuff about extensions; used indirectly by {@linkcode ExtensionCommand.list}.
 *
 * @typedef ExtensionMetadata
 * @property {boolean} installed - If `true`, the extension is installed
 * @property {string?} updateVersion - If the extension is installed, the version it can be updated to
 * @property {string?} unsafeUpdateVersion - Same as above, but a major version bump
 * @property {boolean} upToDate - If the extension is installed and the latest
 */

/**
 * @typedef {import('@appium/types').ExtensionType} ExtensionType
 * @typedef {import('@appium/types').DriverType} DriverType
 * @typedef {import('@appium/types').PluginType} PluginType
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {import('appium/types').ExtRecord<ExtType>} ExtRecord
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {import('../extension/extension-config').ExtensionConfig<ExtType>} ExtensionConfig
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {import('appium/types').ExtMetadata<ExtType>} ExtMetadata
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {import('appium/types').ExtManifest<ExtType>} ExtManifest
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {import('appium/types').ExtPackageJson<ExtType>} ExtPackageJson
 */

/**
 * Possible return value for {@linkcode ExtensionCommand.list}
 * @typedef UninstalledExtensionListData
 * @property {string} pkgName
 * @property {false} installed
 */

/**
 * Possible return value for {@linkcode ExtensionCommand.list}
 * @typedef {import('appium/types').InternalMetadata & ExtensionMetadata} InstalledExtensionListData
 */

/**
 * Return value of {@linkcode ExtensionCommand.list}.
 * @typedef {Record<string,InstalledExtensionListData|UninstalledExtensionListData>} ExtensionListData
 */

/**
 * Options for {@linkcode ExtensionCommand._run}.
 * @typedef RunOptions
 * @property {string} installSpec - name of the extension to run a script from
 * @property {string} scriptName - name of the script to run
 */

/**
 * Return value of {@linkcode ExtensionCommand._run}
 *
 * @typedef RunOutput
 * @property {string} [error] - error message if script ran unsuccessfully, otherwise undefined
 * @property {string[]} output - script output
 */

/**
 * Options for {@linkcode ExtensionCommand._update}.
 * @typedef ExtensionUpdateOpts
 * @property {string} installSpec - the name of the extension to update
 * @property {boolean} unsafe - if true, will perform unsafe updates past major revision boundaries
 */

/**
 * Return value of {@linkcode ExtensionCommand._update}.
 * @typedef ExtensionUpdateResult
 * @property {Record<string,Error>} errors - map of ext names to error objects
 * @property {Record<string,UpdateReport>} updates - map of ext names to {@linkcode UpdateReport}s
 */

/**
 * Part of result of {@linkcode ExtensionCommand._update}.
 * @typedef UpdateReport
 * @property {string} from - version the extension was updated from
 * @property {string} to - version the extension was updated to
 */

/**
 * Options for {@linkcode ExtensionCommand._uninstall}.
 * @typedef UninstallOpts
 * @property {string} installSpec - the name or spec of an extension to uninstall
 */

/**
 * Used by {@linkcode ExtensionCommand.getPostInstallText}
 * @typedef ExtensionArgs
 * @property {string} extName - the name of an extension
 * @property {object} extData - the data for an installed extension
 */

/**
 * Options for {@linkcode ExtensionCommand.installViaNpm}
 * @typedef InstallViaNpmArgs
 * @property {string} installSpec - the name or spec of an extension to install
 * @property {string} pkgName - the NPM package name of the extension
 * @property {string} [pkgVer] - the specific version of the NPM package
 */

/**
 * Object returned by {@linkcode ExtensionCommand.checkForExtensionUpdate}
 * @typedef PossibleUpdates
 * @property {string} current - current version
 * @property {string?} safeUpdate - version we can safely update to if it exists, or null
 * @property {string?} unsafeUpdate - version we can unsafely update to if it exists, or null
 */

/**
 * Options for {@linkcode ExtensionCommand._install}
 * @typedef InstallArgs
 * @property {string} installSpec - the name or spec of an extension to install
 * @property {import('appium/types').InstallType} installType - how to install this extension. One of the INSTALL_TYPES
 * @property {string} [packageName] - for git/github installs, the extension node package name
 */

/**
 * Returned by {@linkcode ExtensionCommand.getExtensionFields}
 * @template {ExtensionType} ExtType
 * @typedef {ExtMetadata<ExtType> & { pkgName: string, version: string, appiumVersion: string } & import('appium/types').CommonExtMetadata} ExtensionFields
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {ExtType extends DriverType ? typeof import('../constants').KNOWN_DRIVERS : ExtType extends PluginType ? typeof import('../constants').KNOWN_PLUGINS : never} KnownExtensions
 */

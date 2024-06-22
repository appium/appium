/* eslint-disable no-console */
import B from 'bluebird';
import _ from 'lodash';
import path from 'path';
import {npm, util, env, console, fs, system} from '@appium/support';
import {spinWith, RingBuffer} from './utils';
import {
  INSTALL_TYPE_NPM,
  INSTALL_TYPE_GIT,
  INSTALL_TYPE_GITHUB,
  INSTALL_TYPE_LOCAL,
  INSTALL_TYPE_DEV,
} from '../extension/extension-config';
import {SubProcess} from 'teen_process';
import {packageDidChange} from '../extension/package-changed';
import {spawn} from 'child_process';
import {inspect} from 'node:util';
import {pathToFileURL} from 'url';
import {Doctor, EXIT_CODE as DOCTOR_EXIT_CODE} from '../doctor/doctor';
import {npmPackage} from '../utils';
import semver from 'semver';

const UPDATE_ALL = 'installed';

class NotUpdatableError extends Error {}
class NoUpdatesAvailableError extends Error {}

/**
 * Omits `driverName`/`pluginName` props from the receipt to make a {@linkcode ExtManifest}
 * @template {ExtensionType} ExtType
 * @param {ExtInstallReceipt<ExtType>} receipt
 * @returns {ExtManifest<ExtType>}
 */
function receiptToManifest(receipt) {
  return /** @type {ExtManifest<ExtType>} */ (_.omit(receipt, 'driverName', 'pluginName'));
}

/**
 * Fetches the remote extension version requirements
 *
 * @param {string} pkgName Extension name
 * @param {string} [pkgVer] Extension version (if not provided then the latest is assumed)
 * @returns {Promise<[string, string|null]>}
 */
async function getRemoteExtensionVersionReq(pkgName, pkgVer) {
  const allDeps = await npm.getPackageInfo(
    `${pkgName}${pkgVer ? `@${pkgVer}` : ``}`,
    ['peerDependencies', 'dependencies']
  );
  const requiredVersionPair = _.flatMap(_.values(allDeps).map(_.toPairs))
    .find(([name]) => name === 'appium');
  return [npmPackage.version, requiredVersionPair ? requiredVersionPair[1] : null];
}

/**
 * @template {ExtensionType} ExtType
 */
class ExtensionCliCommand {
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
    this.log = new console.CliConsole({jsonMode: json});
    this.isJsonOutput = Boolean(json);
  }

  /**
   * `driver` or `plugin`, depending on the `ExtensionConfig`.
   */
  get type() {
    return this.config.extensionType;
  }

  /**
   * Logs a message and returns an {@linkcode Error} to throw.
   *
   * For TS to understand that a function throws an exception, it must actually throw an exception--
   * in other words, _calling_ a function which is guaranteed to throw an exception is not enough--
   * nor is something like `@returns {never}` which does not imply a thrown exception.
   * @param {string} message
   * @protected
   * @throws {Error}
   */
  _createFatalError(message) {
    return new Error(this.log.decorate(message, 'error'));
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
      throw this._createFatalError(`Cannot handle ${this.type} command ${cmd}`);
    }
    const executeCmd = this[cmd].bind(this);
    return await executeCmd(args);
  }

  /**
   * List extensions
   * @template {ExtensionType} ExtType
   * @param {ListOptions} opts
   * @return {Promise<ExtensionList<ExtType>>} map of extension names to extension data
   */
  async list({showInstalled, showUpdates, verbose = false}) {
    let lsMsg = `Listing ${showInstalled ? 'installed' : 'available'} ${this.type}s`;
    if (verbose) {
      lsMsg += ' (verbose mode)';
    }
    const installedNames = Object.keys(this.config.installedExtensions);
    const knownNames = Object.keys(this.knownExtensions);
    const listData = [...installedNames, ...knownNames].reduce((acc, name) => {
      if (!acc[name]) {
        if (installedNames.includes(name)) {
          acc[name] = {
            .../** @type {Partial<ExtManifest<ExtType>>} */ (this.config.installedExtensions[name]),
            installed: true,
          };
        } else if (!showInstalled) {
          acc[name] = /** @type {ExtensionListData<ExtType>} */ ({
            pkgName: this.knownExtensions[name],
            installed: false,
          });
        }
      }
      return acc;
    }, /** @type {ExtensionList<ExtType>} */ ({}));

    // if we want to show whether updates are available, put that behind a spinner
    await spinWith(this.isJsonOutput, lsMsg, async () => {
      if (!showUpdates) {
        return;
      }
      for (const [ext, data] of _.toPairs(listData)) {
        if (!data.installed || data.installType !== INSTALL_TYPE_NPM) {
          // don't need to check for updates on exts that aren't installed
          // also don't need to check for updates on non-npm exts
          continue;
        }
        try {
          const updates = await this.checkForExtensionUpdate(ext);
          data.updateVersion = updates.safeUpdate;
          data.unsafeUpdateVersion = updates.unsafeUpdate;
          data.upToDate = updates.safeUpdate === null && updates.unsafeUpdate === null;
        } catch (e) {
          data.updateError = e.message;
        }
      }
    });

    /**
     * Type guard to narrow "installed" extensions, which have more data
     * @param {any} data
     * @returns {data is InstalledExtensionListData<ExtType>}
     */
    const extIsInstalled = (data) => Boolean(data.installed);

    // if we're just getting the data, short circuit return here since we don't need to do any
    // formatting logic
    if (this.isJsonOutput) {
      return listData;
    }

    if (verbose) {
      this.log.log(inspect(listData, {colors: true, depth: null}));
      return listData;
    }
    for (const [name, data] of _.toPairs(listData)) {
      let installTxt = ' [not installed]'.grey;
      let updateTxt = '';
      let upToDateTxt = '';
      let unsafeUpdateTxt = '';
      if (extIsInstalled(data)) {
        const {
          installType,
          installSpec,
          updateVersion,
          unsafeUpdateVersion,
          version,
          upToDate,
          updateError,
        } = data;
        let typeTxt;
        switch (installType) {
          case INSTALL_TYPE_GIT:
          case INSTALL_TYPE_GITHUB:
            typeTxt = `(cloned from ${installSpec})`.yellow;
            break;
          case INSTALL_TYPE_LOCAL:
            typeTxt = `(linked from ${installSpec})`.magenta;
            break;
          case INSTALL_TYPE_DEV:
            typeTxt = '(dev mode)';
            break;
          default:
            typeTxt = '(npm)';
        }
        installTxt = `@${version.yellow} ${('[installed ' + typeTxt + ']').green}`;

        if (showUpdates) {
          if (updateError) {
            updateTxt = ` [Cannot check for updates: ${updateError}]`.red;
          } else {
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
      }

      this.log.log(`- ${name.yellow}${installTxt}${updateTxt}${upToDateTxt}${unsafeUpdateTxt}`);
    }

    return listData;
  }

  /**
   * Checks whether the given extension is compatible with the currently installed server
   *
   * @param {InstallViaNpmArgs} installViaNpmOpts
   * @returns {Promise<void>}
   */
  async _checkInstallCompatibility({installSpec, pkgName, pkgVer, installType}) {
    if (INSTALL_TYPE_NPM !== installType) {
      return;
    }

    await spinWith(this.isJsonOutput, `Checking if '${pkgName}' is compatible`, async () => {
      const [serverVersion, extVersionRequirement] = await getRemoteExtensionVersionReq(pkgName, pkgVer);
      if (serverVersion && extVersionRequirement && !semver.satisfies(serverVersion, extVersionRequirement)) {
        throw this._createFatalError(
          `'${installSpec}' cannot be installed because the server version it requires (${extVersionRequirement}) ` +
          `does not meet the currently installed one (${serverVersion}). Please install ` +
          `a compatible server version first.`
        );
      }
    });
  }

  /**
   * Install an extension
   *
   * @param {InstallOpts} opts
   * @return {Promise<ExtRecord<ExtType>>} map of all installed extension names to extension data
   */
  async _install({installSpec, installType, packageName}) {
    /** @type {ExtInstallReceipt<ExtType>} */
    let receipt;

    if (packageName && [INSTALL_TYPE_LOCAL, INSTALL_TYPE_NPM].includes(installType)) {
      throw this._createFatalError(`When using --source=${installType}, cannot also use --package`);
    }

    if (!packageName && [INSTALL_TYPE_GIT, INSTALL_TYPE_GITHUB].includes(installType)) {
      throw this._createFatalError(`When using --source=${installType}, must also use --package`);
    }

    /**
     * @type {InstallViaNpmArgs}
     */
    let installViaNpmOpts;

    /**
     * The probable (?) name of the extension derived from the install spec.
     *
     * If using a local install type, this will remain empty.
     * @type {string}
     */
    let probableExtName = '';

    // depending on `installType`, build the options to pass into `installViaNpm`
    if (installType === INSTALL_TYPE_GITHUB) {
      if (installSpec.split('/').length !== 2) {
        throw this._createFatalError(
          `Github ${this.type} spec ${installSpec} appeared to be invalid; ` +
            'it should be of the form <org>/<repo>'
        );
      }
      installViaNpmOpts = {
        installSpec,
        installType,
        pkgName: /** @type {string} */ (packageName),
      };
      probableExtName = installSpec;
    } else if (installType === INSTALL_TYPE_GIT) {
      // git urls can have '.git' at the end, but this is not necessary and would complicate the
      // way we download and name directories, so we can just remove it
      installSpec = installSpec.replace(/\.git$/, '');
      installViaNpmOpts = {
        installSpec,
        installType,
        pkgName: /** @type {string} */ (packageName),
      };
      probableExtName = installSpec;
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
            throw this._createFatalError(msg);
          }
          probableExtName = name;
          pkgName = this.knownExtensions[name];
          // given that we'll use the install type in the driver json, store it as
          // 'npm' now
          installType = INSTALL_TYPE_NPM;
        }
      }
      installViaNpmOpts = {installSpec, pkgName, pkgVer, installType};
    }

    // fail fast here if we can
    if (probableExtName && this.config.isInstalled(probableExtName)) {
      throw this._createFatalError(
        `A ${this.type} named "${probableExtName}" is already installed. ` +
          `Did you mean to update? Run "appium ${this.type} update". See ` +
          `installed ${this.type}s with "appium ${this.type} list --installed".`
      );
    }

    await this._checkInstallCompatibility(installViaNpmOpts);

    receipt = await this.installViaNpm(installViaNpmOpts);

    // this _should_ be the same as `probablyExtName` as the one derived above unless
    // install type is local.
    /** @type {string} */
    const extName = receipt[/** @type {string} */ (`${this.type}Name`)];

    // check _a second time_ with the more-accurate extName
    if (this.config.isInstalled(extName)) {
      throw this._createFatalError(
        `A ${this.type} named "${extName}" is already installed. ` +
          `Did you mean to update? Run "appium ${this.type} update". See ` +
          `installed ${this.type}s with "appium ${this.type} list --installed".`
      );
    }

    // this field does not exist as such in the manifest (it's used as a property name instead)
    // so that's why it's being removed here.
    /** @type {ExtManifest<ExtType>} */
    const extManifest = receiptToManifest(receipt);

    const [errors, warnings] = await B.all([
      this.config.getProblems(extName, extManifest),
      this.config.getWarnings(extName, extManifest),
    ]);
    const errorMap = new Map([[extName, errors]]);
    const warningMap = new Map([[extName, warnings]]);
    const {errorSummaries, warningSummaries} = this.config.getValidationResultSummaries(
      errorMap,
      warningMap
    );

    if (!_.isEmpty(errorSummaries)) {
      throw this._createFatalError(errorSummaries.join('\n'));
    }

    // note that we won't show any warnings if there were errors.
    if (!_.isEmpty(warningSummaries)) {
      this.log.warn(warningSummaries.join('\n'));
    }

    await this.config.addExtension(extName, extManifest);

    // update the hash if we've changed the local `package.json`
    if (await env.hasAppiumDependency(this.config.appiumHome)) {
      await packageDidChange(this.config.appiumHome);
    }

    // log info for the user
    this.log.info(this.getPostInstallText({extName, extData: receipt}));

    return this.config.installedExtensions;
  }

  /**
   * Install an extension via NPM
   *
   * @param {InstallViaNpmArgs} args
   * @returns {Promise<ExtInstallReceipt<ExtType>>}
   */
  async installViaNpm({installSpec, pkgName, pkgVer, installType}) {
    const npmSpec = `${pkgName}${pkgVer ? '@' + pkgVer : ''}`;
    const specMsg = npmSpec === installSpec ? '' : ` using NPM install spec '${npmSpec}'`;
    const msg = `Installing '${installSpec}'${specMsg}`;
    try {
      const {pkg, path} = await spinWith(this.isJsonOutput, msg, async () => {
        const {pkg, installPath: path} = await npm.installPackage(this.config.appiumHome, pkgName, {
          pkgVer,
          installType,
        });
        this.validatePackageJson(pkg, installSpec);
        return {pkg, path};
      });

      return this.getInstallationReceipt({
        pkg,
        installPath: path,
        installType,
        installSpec,
      });
    } catch (err) {
      throw this._createFatalError(`Encountered an error when installing package: ${err.message}`);
    }
  }

  /**
   * Get the text which should be displayed to the user after an extension has been installed. This
   * is designed to be overridden by drivers/plugins with their own particular text.
   *
   * @param {ExtensionArgs} args
   * @returns {string}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPostInstallText(args) {
    throw this._createFatalError('Must be implemented in final class');
  }

  /**
   * Once a package is installed on-disk, this gathers some necessary metadata for validation.
   *
   * @param {GetInstallationReceiptOpts<ExtType>} opts
   * @returns {ExtInstallReceipt<ExtType>}
   */
  getInstallationReceipt({pkg, installPath, installType, installSpec}) {
    const {appium, name, version, peerDependencies} = pkg;

    /** @type {import('appium/types').InternalMetadata} */
    const internal = {
      pkgName: name,
      version,
      installType,
      installSpec,
      installPath,
      appiumVersion: peerDependencies?.appium,
    };

    /** @type {ExtMetadata<ExtType>} */
    const extMetadata = appium;

    return {
      ...internal,
      ...extMetadata,
    };
  }

  /**
   * Validates the _required_ root fields of an extension's `package.json` file.
   *
   * These required fields are:
   * - `name`
   * - `version`
   * - `appium`
   * @param {import('type-fest').PackageJson} pkg - `package.json` of extension
   * @param {string} installSpec - Extension name/spec
   * @throws {ReferenceError} If `package.json` has a missing or invalid field
   * @returns {pkg is ExtPackageJson<ExtType>}
   */
  validatePackageJson(pkg, installSpec) {
    const {appium, name, version} = /** @type {ExtPackageJson<ExtType>} */ (pkg);

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateExtensionFields(extMetadata, installSpec) {
    throw this._createFatalError('Must be implemented in final class');
  }

  /**
   * Uninstall an extension.
   *
   * First tries to do this via `npm uninstall`, but if that fails, just `rm -rf`'s the extension dir.
   *
   * Will only remove the extension from the manifest if it has been successfully removed.
   *
   * @param {UninstallOpts} opts
   * @return {Promise<ExtRecord<ExtType>>} map of all installed extension names to extension data (without the extension just uninstalled)
   */
  async _uninstall({installSpec}) {
    if (!this.config.isInstalled(installSpec)) {
      throw this._createFatalError(
        `Can't uninstall ${this.type} '${installSpec}'; it is not installed`
      );
    }
    const extRecord = this.config.installedExtensions[installSpec];
    if (extRecord.installType === INSTALL_TYPE_DEV) {
      this.log.warn(`Cannot uninstall ${this.type} "${installSpec}" because it is in development!`);
      return this.config.installedExtensions;
    }
    const pkgName = extRecord.pkgName;
    await spinWith(this.isJsonOutput, `Uninstalling ${this.type} '${installSpec}'`, async () => {
      await npm.uninstallPackage(this.config.appiumHome, pkgName);
    });
    await this.config.removeExtension(installSpec);
    this.log.ok(`Successfully uninstalled ${this.type} '${installSpec}'`.green);
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
      throw this._createFatalError(
        `The ${this.type} "${installSpec}" was not installed, so can't be updated`
      );
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
          throw this._createFatalError(
            `The ${this.type} '${e}' has a major revision update ` +
              `(${update.current} => ${update.unsafeUpdate}), which could include ` +
              `breaking changes. If you want to apply this update, re-run with --unsafe`
          );
        }
        const updateVer = unsafe && update.unsafeUpdate ? update.unsafeUpdate : update.safeUpdate;
        await spinWith(
          this.isJsonOutput,
          `Updating ${this.type} '${e}' from ${update.current} to ${updateVer}`,
          async () => await this.updateExtension(e, updateVer)
        );
        // if we're doing a safe update, but an unsafe update is also available, let the user know
        if (!unsafe && update.unsafeUpdate) {
          const newMajorUpdateMsg = `A newer major version ${update.unsafeUpdate} ` +
            `is available for ${this.type} '${e}', which could include breaking changes. ` +
            `If you want to apply this update, re-run with --unsafe`;
          this.log.info(newMajorUpdateMsg.yellow);
        }
        updates[e] = {from: update.current, to: updateVer};
      } catch (err) {
        errors[e] = err;
      }
    }

    this.log.info('Update report:');

    for (const [e, update] of _.toPairs(updates)) {
      this.log.ok(`  - ${this.type} ${e} updated: ${update.from} => ${update.to}`.green);
    }

    for (const [e, err] of _.toPairs(errors)) {
      if (err instanceof NotUpdatableError) {
        this.log.warn(
          `  - '${e}' was not installed via npm, so we could not check ` + `for updates`.yellow
        );
      } else if (err instanceof NoUpdatesAvailableError) {
        this.log.info(`  - '${e}' had no updates available`.yellow);
      } else {
        // otherwise, make it pop with red!
        this.log.error(`  - '${e}' failed to update: ${err}`.red);
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
    /** @type {string?} */
    let unsafeUpdate = await npm.getLatestVersion(this.config.appiumHome, pkgName);
    let safeUpdate = await npm.getLatestSafeUpgradeVersion(
      this.config.appiumHome,
      pkgName,
      version
    );
    if (unsafeUpdate !== null && !util.compareVersions(unsafeUpdate, '>', version)) {
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
    const {pkgName, installType} = this.config.installedExtensions[installSpec];
    const extData = await this.installViaNpm({
      installSpec,
      installType,
      pkgName,
      pkgVer: version,
    });
    delete extData[/** @type {string} */ (`${this.type}Name`)];
    await this.config.updateExtension(installSpec, extData);
  }

  /**
   * Just wraps {@linkcode child_process.spawn} with some default options
   *
   * @param {string} cwd - CWD
   * @param {string} script - Path to script
   * @param {string[]} args - Extra args for script
   * @param {import('child_process').SpawnOptions} opts - Options
   * @returns {import('node:child_process').ChildProcess}
   */
  _runUnbuffered(cwd, script, args = [], opts = {}) {
    return spawn(process.execPath, [script, ...args], {
      cwd,
      stdio: 'inherit',
      ...opts,
    });
  }

  /**
   * Runs doctor checks for the given extension.
   *
   * @param {DoctorOptions} opts
   * @returns {Promise<number>} The amount of Doctor checks that were
   * successfully loaded and executed for the given extension
   * @throws {Error} If any of the mandatory Doctor checks fails.
   */
  async _doctor({installSpec}) {
    if (!this.config.isInstalled(installSpec)) {
      throw this._createFatalError(`The ${this.type} "${installSpec}" is not installed`);
    }

    const moduleRoot = this.config.getInstallPath(installSpec);
    const packageJsonPath = path.join(moduleRoot, 'package.json');
    if (!await fs.exists(packageJsonPath)) {
      throw this._createFatalError(
        `No package.json could be found for "${installSpec}" ${this.type}`
      );
    }
    let doctorSpec;
    try {
      doctorSpec = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')).appium?.doctor;
    } catch (e) {
      throw this._createFatalError(
        `The manifest at '${packageJsonPath}' cannot be parsed: ${e.message}`
      );
    }
    if (!doctorSpec) {
      this.log.info(`The ${this.type} "${installSpec}" does not export any doctor checks`);
      return 0;
    }
    if (!_.isPlainObject(doctorSpec) || !_.isArray(doctorSpec.checks)) {
      throw this._createFatalError(
        `The 'doctor' entry in the package manifest '${packageJsonPath}' must be a proper object ` +
        `containing the 'checks' key with the array of script paths`
      );
    }
    const paths = doctorSpec.checks.map((/** @type {string} */ p) => {
      const scriptPath = path.resolve(moduleRoot, p);
      if (!path.normalize(scriptPath).startsWith(path.normalize(moduleRoot))) {
        this.log.error(
          `The doctor check script '${p}' from the package manifest '${packageJsonPath}' must be located ` +
          `in the '${moduleRoot}' root folder. It will be skipped`
        );
        return null;
      }
      return scriptPath;
    }).filter(Boolean);
    /** @type {Promise[]} */
    const loadChecksPromises = [];
    for (const p of paths) {
      const promise = (async () => {
        // https://github.com/nodejs/node/issues/31710
        const scriptPath = system.isWindows() ? pathToFileURL(p).href : p;
        try {
          return await import(scriptPath);
        } catch (e) {
          this.log.warn(`Unable to load doctor checks from '${p}': ${e.message}`);
        }
      })();
      loadChecksPromises.push(promise);
    }
    const isDoctorCheck = (/** @type {any} */ x) =>
      ['diagnose', 'fix', 'hasAutofix', 'isOptional'].every((method) => _.isFunction(x?.[method]));
    /** @type {import('@appium/types').IDoctorCheck[]} */
    const checks = _.flatMap((await B.all(loadChecksPromises)).filter(Boolean).map(_.toPairs))
      .map(([, value]) => value)
      .filter(isDoctorCheck);
    if (_.isEmpty(checks)) {
      this.log.info(`The ${this.type} "${installSpec}" exports no valid doctor checks`);
      return 0;
    }
    this.log.debug(
      `Running ${util.pluralize('doctor check', checks.length, true)} ` +
      `for the "${installSpec}" ${this.type}`
    );
    const exitCode = await new Doctor(checks).run();
    if (exitCode !== DOCTOR_EXIT_CODE.SUCCESS) {
      throw this._createFatalError('Treatment required');
    }
    return checks.length;
  }

  /**
   * Runs a script cached inside the `scripts` field under `appium`
   * inside of the extension's `package.json` file. Will throw
   * an error if the driver/plugin does not contain a `scripts` field
   * underneath the `appium` field in its `package.json`, if the
   * `scripts` field is not a plain object, or if the `scriptName` is
   * not found within `scripts` object.
   *
   * @param {RunOptions} opts
   * @return {Promise<RunOutput>}
   */
  async _run({installSpec, scriptName, extraArgs = [], bufferOutput = false}) {
    if (!this.config.isInstalled(installSpec)) {
      throw this._createFatalError(`The ${this.type} "${installSpec}" is not installed`);
    }

    const extConfig = this.config.installedExtensions[installSpec];

    // note: TS cannot understand that _.has() is a type guard
    if (!('scripts' in extConfig)) {
      throw this._createFatalError(
        `The ${this.type} named '${installSpec}' does not contain the ` +
          `"scripts" field underneath the "appium" field in its package.json`
      );
    }

    const extScripts = extConfig.scripts;

    if (!extScripts || !_.isPlainObject(extScripts)) {
      throw this._createFatalError(
        `The ${this.type} named '${installSpec}' "scripts" field must be a plain object`
      );
    }

    if (!scriptName) {
      const allScripts = _.toPairs(extScripts);
      const root = this.config.getInstallPath(installSpec);
      const existingScripts = await B.filter(
        allScripts,
        async ([, p]) => await fs.exists(path.join(root, p))
      );
      if (_.isEmpty(existingScripts)) {
        this.log.info(`The ${this.type} named '${installSpec}' does not contain any scripts`);
      } else {
        this.log.info(`The ${this.type} named '${installSpec}' contains ` +
          `${util.pluralize('script', existingScripts.length, true)}:`);
        existingScripts.forEach(([name]) => this.log.info(`  - ${name}`));
      }
      this.log.ok(`Successfully retrieved the list of scripts`.green);
      return {};
    }

    if (!(scriptName in /** @type {Record<string,string>} */ (extScripts))) {
      throw this._createFatalError(
        `The ${this.type} named '${installSpec}' does not support the script: '${scriptName}'`
      );
    }

    const scriptPath = extScripts[scriptName];
    const moduleRoot = this.config.getInstallPath(installSpec);
    const normalizedScriptPath = path.normalize(path.resolve(moduleRoot, scriptPath));
    if (!normalizedScriptPath.startsWith(path.normalize(moduleRoot))) {
      throw this._createFatalError(
        `The '${scriptPath}' script must be located in the '${moduleRoot}' folder`
      );
    }

    if (bufferOutput) {
      const runner = new SubProcess(process.execPath, [scriptPath, ...extraArgs], {
        cwd: moduleRoot,
      });

      const output = new RingBuffer(50);

      runner.on('stream-line', (line) => {
        output.enqueue(line);
        this.log.log(line);
      });

      await runner.start(0);

      try {
        await runner.join();
        this.log.ok(`${scriptName} successfully ran`.green);
        return {output: output.getBuff()};
      } catch (err) {
        this.log.error(`Encountered an error when running '${scriptName}': ${err.message}`.red);
        return {error: err.message, output: output.getBuff()};
      }
    }

    try {
      await new B((resolve, reject) => {
        this._runUnbuffered(moduleRoot, scriptPath, extraArgs)
          .on('error', (err) => {
            // generally this is of the "I can't find the script" variety.
            // this is a developer bug: the extension is pointing to a script that is not where the
            // developer said it would be (in `appium.scripts` of the extension's `package.json`)
            reject(err);
          })
          .on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Script "${scriptName}" exited with code ${code}`));
            }
          });
      });
      this.log.ok(`${scriptName} successfully ran`.green);
      return {};
    } catch (err) {
      this.log.error(`Encountered an error when running '${scriptName}': ${err.message}`.red);
      return {error: err.message};
    }
  }
}

export default ExtensionCliCommand;
export {ExtensionCliCommand as ExtensionCommand};

/**
 * Options for the {@linkcode ExtensionCliCommand} constructor
 * @template {ExtensionType} ExtType
 * @typedef ExtensionCommandOptions
 * @property {ExtensionConfig<ExtType>} config - the `DriverConfig` or `PluginConfig` instance used for this command
 * @property {boolean} json - whether the output of this command should be JSON or text
 */

/**
 * Extra stuff about extensions; used indirectly by {@linkcode ExtensionCliCommand.list}.
 *
 * @typedef ExtensionListMetadata
 * @property {boolean} installed - If `true`, the extension is installed
 * @property {boolean} upToDate - If the extension is installed and the latest
 * @property {string|null} updateVersion - If the extension is installed, the version it can be updated to
 * @property {string|null} unsafeUpdateVersion - Same as above, but a major version bump
 * @property {string} [updateError] - Update check error message (if present)
 * @property {boolean} [devMode] - If Appium is run from an extension's working copy
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
 * @template {ExtensionType} ExtType
 * @typedef {import('appium/types').ExtInstallReceipt<ExtType>} ExtInstallReceipt
 */

/**
 * Possible return value for {@linkcode ExtensionCliCommand.list}
 * @template {ExtensionType} ExtType
 * @typedef {Partial<ExtManifest<ExtType>> & Partial<ExtensionListMetadata>} ExtensionListData
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {ExtManifest<ExtType> & ExtensionListMetadata} InstalledExtensionListData
 */

/**
 * Return value of {@linkcode ExtensionCliCommand.list}.
 * @template {ExtensionType} ExtType
 * @typedef {Record<string,ExtensionListData<ExtType>>} ExtensionList
 */

/**
 * Options for {@linkcode ExtensionCliCommand._run}.
 * @typedef RunOptions
 * @property {string} installSpec - name of the extension to run a script from
 * @property {string} [scriptName] - name of the script to run. If not provided
 * then all available script names will be printed
 * @property {string[]} [extraArgs] - arguments to pass to the script
 * @property {boolean} [bufferOutput] - if true, will buffer the output of the script and return it
 */

/**
 * Options for {@linkcode ExtensionCliCommand.doctor}.
 * @typedef DoctorOptions
 * @property {string} installSpec - name of the extension to run doctor checks for
 */

/**
 * Return value of {@linkcode ExtensionCliCommand._run}
 *
 * @typedef RunOutput
 * @property {string} [error] - error message if script ran unsuccessfully, otherwise undefined
 * @property {string[]} [output] - script output if `bufferOutput` was `true` in {@linkcode RunOptions}
 */

/**
 * Options for {@linkcode ExtensionCliCommand._update}.
 * @typedef ExtensionUpdateOpts
 * @property {string} installSpec - the name of the extension to update
 * @property {boolean} unsafe - if true, will perform unsafe updates past major revision boundaries
 */

/**
 * Return value of {@linkcode ExtensionCliCommand._update}.
 * @typedef ExtensionUpdateResult
 * @property {Record<string,Error>} errors - map of ext names to error objects
 * @property {Record<string,UpdateReport>} updates - map of ext names to {@linkcode UpdateReport}s
 */

/**
 * Part of result of {@linkcode ExtensionCliCommand._update}.
 * @typedef UpdateReport
 * @property {string} from - version the extension was updated from
 * @property {string} to - version the extension was updated to
 */

/**
 * Options for {@linkcode ExtensionCliCommand._uninstall}.
 * @typedef UninstallOpts
 * @property {string} installSpec - the name or spec of an extension to uninstall
 */

/**
 * Used by {@linkcode ExtensionCliCommand.getPostInstallText}
 * @typedef ExtensionArgs
 * @property {string} extName - the name of an extension
 * @property {object} extData - the data for an installed extension
 */

/**
 * Options for {@linkcode ExtensionCliCommand.installViaNpm}
 * @typedef InstallViaNpmArgs
 * @property {string} installSpec - the name or spec of an extension to install
 * @property {string} pkgName - the NPM package name of the extension
 * @property {import('appium/types').InstallType} installType - type of install
 * @property {string} [pkgVer] - the specific version of the NPM package
 */

/**
 * Object returned by {@linkcode ExtensionCliCommand.checkForExtensionUpdate}
 * @typedef PossibleUpdates
 * @property {string} current - current version
 * @property {string?} safeUpdate - version we can safely update to if it exists, or null
 * @property {string?} unsafeUpdate - version we can unsafely update to if it exists, or null
 */

/**
 * Options for {@linkcode ExtensionCliCommand._install}
 * @typedef InstallOpts
 * @property {string} installSpec - the name or spec of an extension to install
 * @property {InstallType} installType - how to install this extension. One of the INSTALL_TYPES
 * @property {string} [packageName] - for git/github installs, the extension node package name
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {ExtType extends DriverType ? typeof import('../constants').KNOWN_DRIVERS : ExtType extends PluginType ? typeof import('../constants').KNOWN_PLUGINS : never} KnownExtensions
 */

/**
 * @typedef ListOptions
 * @property {boolean} showInstalled - whether should show only installed extensions
 * @property {boolean} showUpdates - whether should show available updates
 * @property {boolean} [verbose] - whether to show additional data from the extension
 */

/**
 * Opts for {@linkcode ExtensionCliCommand.getInstallationReceipt}
 * @template {ExtensionType} ExtType
 * @typedef GetInstallationReceiptOpts
 * @property {string} installPath
 * @property {string} installSpec
 * @property {ExtPackageJson<ExtType>} pkg
 * @property {InstallType} installType
 */

/**
 * @typedef {import('appium/types').InstallType} InstallType
 */

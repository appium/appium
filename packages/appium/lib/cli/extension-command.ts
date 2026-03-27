import B from 'bluebird';
import _ from 'lodash';
import path from 'node:path';
import type {AppiumLogger, ExtensionType, IDoctorCheck} from '@appium/types';
import type {
  ExtInstallReceipt as AppiumExtInstallReceipt,
  ExtManifest as AppiumExtManifest,
  ExtMetadata as AppiumExtMetadata,
  ExtPackageJson as AppiumExtPackageJson,
  ExtRecord as AppiumExtRecord,
  InstallType,
} from 'appium/types';
import type {ExtensionConfig as BaseExtensionConfig} from '../extension/extension-config';
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
import {spawn} from 'node:child_process';
import {inspect} from 'node:util';
import {pathToFileURL} from 'node:url';
import {Doctor, EXIT_CODE as DOCTOR_EXIT_CODE} from '../doctor/doctor';
import {getAppiumModuleRoot, npmPackage} from '../utils';
import * as semver from 'semver';

const UPDATE_ALL = 'installed';
const MAX_CONCURRENT_REPO_FETCHES = 5;

class NotUpdatableError extends Error {}
class NoUpdatesAvailableError extends Error {}

/**
 * Options for the {@linkcode ExtensionCliCommand} constructor
 */
export type ExtensionCommandOptions<ExtType extends ExtensionType = ExtensionType> = {
  config: ExtensionConfig<ExtType>;
  json: boolean;
};

export type ExtensionConfig<ExtType extends ExtensionType = ExtensionType> = BaseExtensionConfig<ExtType>;
export type ExtRecord<ExtType extends ExtensionType = ExtensionType> = AppiumExtRecord<ExtType>;
export type ExtMetadata<ExtType extends ExtensionType = ExtensionType> = AppiumExtMetadata<ExtType>;
export type ExtManifest<ExtType extends ExtensionType = ExtensionType> = AppiumExtManifest<ExtType>;
export type ExtPackageJson<ExtType extends ExtensionType = ExtensionType> = AppiumExtPackageJson<ExtType>;
export type ExtInstallReceipt<ExtType extends ExtensionType = ExtensionType> =
  AppiumExtInstallReceipt<ExtType>;

/**
 * Extra stuff about extensions; used indirectly by {@linkcode ExtensionCliCommand.list}.
 */
export type ExtensionListMetadata = {
  installed: boolean;
  upToDate?: boolean;
  updateVersion?: string | null;
  unsafeUpdateVersion?: string | null;
  updateError?: string;
  devMode?: boolean;
  repositoryUrl?: string;
};

/**
 * Possible return value for {@linkcode ExtensionCliCommand.list}
 */
export type ExtensionListData<ExtType extends ExtensionType = ExtensionType> = Partial<
  ExtManifest<ExtType>
> &
  Partial<ExtensionListMetadata>;

export type InstalledExtensionListData<ExtType extends ExtensionType = ExtensionType> = ExtManifest<ExtType> &
  ExtensionListMetadata;

/**
 * Return value of {@linkcode ExtensionCliCommand.list}.
 */
export type ExtensionList<ExtType extends ExtensionType = ExtensionType> = Record<
  string,
  ExtensionListData<ExtType>
>;

/**
 * Omits `driverName`/`pluginName` props from the receipt to make a {@linkcode ExtManifest}
 */
function receiptToManifest(receipt: Record<string, any>): Record<string, any> {
  return _.omit(receipt, 'driverName', 'pluginName');
}

/**
 * Fetches the remote extension version requirements
 *
 * @param pkgName Extension name
 * @param [pkgVer] Extension version (if not provided then the latest is assumed)
 */
async function getRemoteExtensionVersionReq(
  pkgName: string,
  pkgVer?: string
): Promise<[string, string | null]> {
  const allDeps = await npm.getPackageInfo(
    `${pkgName}${pkgVer ? `@${pkgVer}` : ``}`,
    ['peerDependencies', 'dependencies']
  );
  const requiredVersionPair = _.flatMap(_.values(allDeps).map(_.toPairs))
    .find(([name]) => name === 'appium');
  return [npmPackage.version, requiredVersionPair ? requiredVersionPair[1] : null];
}

abstract class ExtensionCliCommand<ExtType extends ExtensionType = ExtensionType> {
  /**
   * This is the `DriverConfig` or `PluginConfig`, depending on `ExtType`.
   */
  protected readonly config: ExtensionConfig<ExtType>;

  /**
   * {@linkcode Record} of official plugins or drivers.
   */
  protected knownExtensions: Record<string, string>;

  /**
   * If `true`, command output has been requested as JSON.
   */
  protected readonly isJsonOutput: boolean;
  protected readonly log: any;

  /**
   * Creates an extension command instance.
   *
   * @param opts - constructor options containing extension config and JSON mode
   */
  constructor({config, json}: ExtensionCommandOptions<ExtType>) {
    this.config = config;
    this.log = new console.CliConsole({jsonMode: json});
    this.isJsonOutput = Boolean(json);
  }

  /**
   * `driver` or `plugin`, depending on the `ExtensionConfig`.
   */
  get type(): ExtensionType {
    return this.config.extensionType;
  }

  /**
   * Logs a message and returns an {@linkcode Error} to throw.
   *
   * For TS to understand that a function throws an exception, it must actually throw an exception--
   * in other words, _calling_ a function which is guaranteed to throw an exception is not enough--
   * nor is something like a `never` return annotation, which does not imply a thrown exception.
   *
   * @throws {Error}
   */
  protected _createFatalError(message: string): Error {
    return new Error(this.log.decorate(message, 'error'));
  }

  /**
   * Executes an extension subcommand from parsed CLI args.
   *
   * @param args - parsed CLI argument object
   * @returns result of the executed extension subcommand
   */
  async execute(args: Record<string, any>): Promise<unknown> {
    const cmd = args[`${this.type}Command`];
    if (!_.isFunction(this[cmd])) {
      throw this._createFatalError(`Cannot handle ${this.type} command ${cmd}`);
    }
    const executeCmd = this[cmd].bind(this);
    return await executeCmd(args);
  }

  /**
   * Lists available/installed extensions and optional update metadata.
   *
   * @param opts - list command options
   * @returns map of extension names to list data
   */
  async list({showInstalled, showUpdates, verbose = false}: ListOptions): Promise<ExtensionList> {
    const listData = this._buildListData(showInstalled);

    const lsMsg =
      `Listing ${showInstalled ? 'installed' : 'available'} ${this.type}s` +
      (verbose ? ' (verbose mode)' : ' (rerun with --verbose for more info)');
    await this._checkForUpdates(listData, showUpdates, lsMsg);

    if (this.isJsonOutput) {
      await this._addRepositoryUrlsToListData(listData);
      return listData;
    }

    if (verbose) {
      await this._addRepositoryUrlsToListData(listData);
      this.log.log(inspect(listData, {colors: true, depth: null}));
      return listData;
    }

    return await this._displayNormalListOutput(listData, showUpdates);
  }

  /**
   * Build the initial list data structure from installed and known extensions
   *
   */
  protected async _install({installSpec, installType, packageName}: InstallOpts): Promise<Record<string, any>> {
    if (packageName && [INSTALL_TYPE_LOCAL, INSTALL_TYPE_NPM].includes(installType)) {
      throw this._createFatalError(`When using --source=${installType}, cannot also use --package`);
    }

    if (!packageName && [INSTALL_TYPE_GIT, INSTALL_TYPE_GITHUB].includes(installType)) {
      throw this._createFatalError(`When using --source=${installType}, must also use --package`);
    }

    let installViaNpmOpts: InstallViaNpmArgs;

    /**
     * The probable (?) name of the extension derived from the install spec.
     *
     * If using a local install type, this will remain empty.
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
        pkgName: packageName as string,
      };
      probableExtName = packageName as string;
    } else if (installType === INSTALL_TYPE_GIT) {
      // git urls can have '.git' at the end, but this is not necessary and would complicate the
      // way we download and name directories, so we can just remove it
      installSpec = installSpec.replace(/\.git$/, '');
      installViaNpmOpts = {
        installSpec,
        installType,
        pkgName: packageName as string,
      };
      probableExtName = packageName as string;
    } else {
      let pkgName: string;
      let pkgVer: string | undefined;
      if (installType === INSTALL_TYPE_LOCAL) {
        pkgName = path.isAbsolute(installSpec) ? installSpec : path.resolve(installSpec);
      } else {
        // at this point we have either an npm package or an appium verified extension
        // name or a local path. both of which will be installed via npm.
        // extensions installed via npm can include versions or tags after the '@'
        // sign, so check for that. We also need to be careful that package names themselves can
        // contain the '@' symbol, as in `npm install @appium/fake-driver@1.2.0`
        let name: string;
        const splits = installSpec.split('@');
        if (installSpec.startsWith('@')) {
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

    const receipt = await this.installViaNpm(installViaNpmOpts);

    // this _should_ be the same as `probablyExtName` as the one derived above unless
    // install type is local.
    const extName = receipt[`${this.type}Name`];

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
    const extManifest = receiptToManifest(receipt);

    const [errors, warnings] = await B.all([
      this.config.getProblems(extName, extManifest as any),
      this.config.getWarnings(extName, extManifest as any),
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

    await this.config.addExtension(extName, extManifest as any);

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
   */
  private async installViaNpm({
    installSpec,
    pkgName,
    pkgVer,
    installType,
  }: InstallViaNpmArgs): Promise<Record<string, any>> {
    const installMsg = `Installing '${installSpec}'`;
    const validateMsg = `Validating '${installSpec}'`;

    // the string used for installation is either <name>@<ver> in the case of a standard NPM
    // package, or whatever the user sent in otherwise.
    const installStr = installType === INSTALL_TYPE_NPM ? `${pkgName}${pkgVer ? `@${pkgVer}` : ''}` : installSpec;
    const appiumHome = this.config.appiumHome;
    try {
      const {pkg, installPath} = await spinWith(
        this.isJsonOutput,
        installMsg,
        async () => await npm.installPackage(appiumHome, installStr, {pkgName, installType})
      );

      await spinWith(this.isJsonOutput, validateMsg, async () => {
        this.validatePackageJson(pkg, installSpec);
      });

      return this.getInstallationReceipt({
        pkg,
        installPath,
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
   */
  protected abstract getPostInstallText(args: ExtensionArgs): string;

  /**
   * Once a package is installed on-disk, this gathers some necessary metadata for validation.
   *
   */
  private getInstallationReceipt({
    pkg,
    installPath,
    installType,
    installSpec,
  }: GetInstallationReceiptOpts): Record<string, any> {
    const {appium, name, version, peerDependencies} = pkg;

    const strVersion = version;
    const internal = {
      pkgName: name,
      version: strVersion,
      installType,
      installSpec,
      installPath,
      appiumVersion: peerDependencies?.appium,
    };

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
   * @param pkg - `package.json` of extension
   * @param installSpec - Extension name/spec
   * @throws {ReferenceError} If `package.json` has a missing or invalid field
   */
  private validatePackageJson(pkg: Record<string, any>, installSpec: string): boolean {
    const {appium, name, version} = pkg;

    const createMissingFieldError = (field: string): ReferenceError =>
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
   * @param extMetadata - the data in the "appium" field of `package.json` for an extension
   * @param installSpec - Extension name/spec
   */
  protected abstract validateExtensionFields(
    extMetadata: Record<string, any>,
    installSpec: string
  ): void;

  /**
   * Uninstall an extension.
   *
   * First tries to do this via `npm uninstall`, but if that fails, just `rm -rf`'s the extension dir.
   *
   * Will only remove the extension from the manifest if it has been successfully removed.
   *
   * @return map of all installed extension names to extension data (without the extension just uninstalled)
   */
  protected async _uninstall({installSpec}: UninstallOpts): Promise<Record<string, any>> {
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
   */
  protected async _update({installSpec, unsafe}: ExtensionUpdateOpts): Promise<ExtensionUpdateResult> {
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
    const errors: Record<string, Error> = {};

    // 'updates' will have ext names as keys and update objects as values, where an update
    // object is of the form {from: versionString, to: versionString}
    const updates: Record<string, {from: string; to: string}> = {};

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
   * @param ext - name of extension
   */
  protected async checkForExtensionUpdate(ext: string): Promise<PossibleUpdates> {
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
   * @param installSpec - name of extension to update
   * @param version - version string identifier to update extension to
   */
  private async updateExtension(installSpec: string, version: string): Promise<void> {
    const {pkgName, installType} = this.config.installedExtensions[installSpec];
    const extData = await this.installViaNpm({
      installSpec,
      installType,
      pkgName,
      pkgVer: version,
    });

    delete extData[`${this.type}Name`];
    await this.config.updateExtension(installSpec, extData as any);
  }

  /**
   * Just wraps {@linkcode child_process.spawn} with some default options
   *
   * @param cwd - CWD
   * @param script - Path to script
   * @param args - Extra args for script
   * @param opts - Options
   */
  private _runUnbuffered(
    cwd: string,
    script: string,
    args: string[] = [],
    opts: Record<string, any> = {}
  ) {
    return spawn(process.execPath, [script, ...args], {
      cwd,
      stdio: 'inherit',
      ...opts,
    });
  }

  /**
   * Runs doctor checks for the given extension.
   *
   * @returns The amount of Doctor checks that were
   * successfully loaded and executed for the given extension
   * @throws {Error} If any of the mandatory Doctor checks fails.
   */
  protected async _doctor({installSpec}: DoctorOptions): Promise<number> {
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
    let doctorSpec: {checks: string[]} | undefined;
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
    const paths: string[] = doctorSpec.checks
      .map((p) => {
      const scriptPath = path.resolve(moduleRoot, p);
      if (!path.normalize(scriptPath).startsWith(path.normalize(moduleRoot))) {
        this.log.error(
          `The doctor check script '${p}' from the package manifest '${packageJsonPath}' must be located ` +
          `in the '${moduleRoot}' root folder. It will be skipped`
        );
        return null;
      }
      return scriptPath;
    })
      .filter((p): p is string => Boolean(p));
    const loadChecksPromises: Promise<unknown>[] = [];
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
    const isDoctorCheck = (x) =>
      ['diagnose', 'fix', 'hasAutofix', 'isOptional'].every((method) => _.isFunction(x?.[method]));
    const checks: IDoctorCheck[] = _.flatMap((await B.all(loadChecksPromises)).filter(Boolean).map(_.toPairs))
      .map(([, value]) => value)
      .filter(isDoctorCheck) as IDoctorCheck[];
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
   */
  protected async _run({
    installSpec,
    scriptName,
    extraArgs = [],
    bufferOutput = false,
  }: RunOptions): Promise<RunOutput> {
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
      const allScripts = _.toPairs(extScripts as Record<string, string>);
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

    if (!(scriptName in extScripts)) {
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
        const message = `Encountered an error when running '${scriptName}': ${err.message}`;
        throw this._createFatalError(message);
      }
    }

    try {
      await new B((resolve, reject) => {
        this._runUnbuffered(moduleRoot, scriptPath, extraArgs)
          .once('error', (err) => {
            // generally this is of the "I can't find the script" variety.
            // this is a developer bug: the extension is pointing to a script that is not where the
            // developer said it would be (in `appium.scripts` of the extension's `package.json`)
            reject(err);
          })
          .once('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Script exited with code ${code}`));
            }
          });
      });
      this.log.ok(`${scriptName} successfully ran`.green);
      return {};
    } catch (err) {
      const message = `Encountered an error when running '${scriptName}': ${err.message}`;
      throw this._createFatalError(message);
    }
  }

  private _buildListData(showInstalled: boolean): ExtensionList {
    const installedNames = Object.keys(this.config.installedExtensions);
    const knownNames = Object.keys(this.knownExtensions);
    return [...installedNames, ...knownNames].reduce((acc, name) => {
      if (!acc[name]) {
        if (installedNames.includes(name)) {
          acc[name] = {
            ...this.config.installedExtensions[name],
            installed: true,
          };
        } else if (!showInstalled) {
          acc[name] = {
            pkgName: this.knownExtensions[name],
            installed: false,
          };
        }
      }
      return acc;
    }, {});
  }

  /**
   * Check for available updates for installed extensions
   *
   */
  private async _checkForUpdates(
    listData: ExtensionList,
    showUpdates: boolean,
    lsMsg: string
  ): Promise<void> {
    await spinWith(this.isJsonOutput, lsMsg, async () => {
      // We'd like to still show lsMsg even if showUpdates is false
      if (!showUpdates) {
        return;
      }

      // Filter to only extensions that need update checks (installed npm packages)
      const extensionsToCheck = _.toPairs(listData as Record<string, any>).filter(
        ([, data]) => data.installed && data.installType === INSTALL_TYPE_NPM
      );

      await B.map(
        extensionsToCheck,
        async ([ext, data]) => {
          try {
            const updates = await this.checkForExtensionUpdate(ext);
            data.updateVersion = updates.safeUpdate;
            data.unsafeUpdateVersion = updates.unsafeUpdate;
            data.upToDate = updates.safeUpdate === null && updates.unsafeUpdate === null;
          } catch (e) {
            data.updateError = (e as Error).message;
          }
        },
        {concurrency: MAX_CONCURRENT_REPO_FETCHES}
      );
    });
  }

  /**
   * Add repository URLs to list data for all extensions
   *
   */
  private async _addRepositoryUrlsToListData(listData: ExtensionList): Promise<void> {
    await spinWith(this.isJsonOutput, 'Fetching repository information', async () => {
      await B.map(
        _.values(listData),
        async (data) => {
          const repoUrl = await this._getRepositoryUrl(data);
          if (repoUrl) {
            data.repositoryUrl = repoUrl;
          }
        },
        {concurrency: MAX_CONCURRENT_REPO_FETCHES}
      );
    });
  }

  /**
   * Display normal formatted output
   *
   */
  private async _displayNormalListOutput(
    listData: ExtensionList,
    showUpdates: boolean
  ): Promise<ExtensionList> {
    for (const [name, data] of _.toPairs(listData)) {
      const line = await this._formatExtensionLine(name, data, showUpdates);
      this.log.log(line);
    }

    return listData;
  }

  /**
   * Format a single extension line for display
   *
   */
  private async _formatExtensionLine(
    name: string,
    data: ExtensionListData,
    showUpdates: boolean
  ): Promise<string> {
    if (data.installed) {
      const installTxt = this._formatInstallText(data);
      const updateTxt = showUpdates ? this._formatUpdateText(data) : '';
      return `- ${name.yellow}${installTxt}${updateTxt}`;
    }
    const installTxt = ' [not installed]'.grey;
    return `- ${name.yellow}${installTxt}`;
  }

  /**
   * Format installation status text
   *
   */
  private _formatInstallText(data: ExtensionListData): string {
    const {installType, installSpec, version} = data;
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
    return `@${String(version).yellow} ${('[installed ' + typeTxt + ']').green}`;
  }

  /**
   * Format update information text
   *
   */
  private _formatUpdateText(data: ExtensionListData): string {
    const {updateVersion, unsafeUpdateVersion, upToDate, updateError} = data;
    if (updateError) {
      return ` [Cannot check for updates: ${updateError}]`.red;
    }
    let txt = '';
    if (updateVersion) {
      txt += ` [${updateVersion} available]`.magenta;
    }
    if (upToDate) {
      txt += ` [Up to date]`.green;
    }
    if (unsafeUpdateVersion) {
      txt += ` [${unsafeUpdateVersion} available (potentially unsafe)]`.cyan;
    }
    return txt;
  }

  /**
   * Get repository URL from package data
   *
   */
  private async _getRepositoryUrl(data: ExtensionListData): Promise<string | null> {
    if (data.installed && data.installPath) {
      return await this._getRepositoryUrlFromInstalled(
        data
      );
    }
    if (data.pkgName && !data.installed) {
      return await this._getRepositoryUrlFromNpm(data.pkgName);
    }
    return null;
  }

  /**
   * Get repository URL from installed extension's package.json
   *
   */
  private async _getRepositoryUrlFromInstalled(data: ExtensionListData): Promise<string | null> {
    try {
      const pkgJsonPath = path.join(String(data.installPath), 'package.json');
      if (await fs.exists(pkgJsonPath)) {
        const pkg = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
        if (pkg.repository) {
          if (typeof pkg.repository === 'string') {
            return pkg.repository;
          }
          if (pkg.repository.url) {
            return pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
          }
        }
      }
    } catch {
      // Ignore errors reading package.json
    }
    return null;
  }

  /**
   * Get repository URL from npm for a package name
   *
   */
  private async _getRepositoryUrlFromNpm(pkgName: string): Promise<string | null> {
    try {
      const repoInfo = await npm.getPackageInfo(pkgName, ['repository']);
      // When requesting only 'repository', npm.getPackageInfo returns the repository object directly
      if (repoInfo) {
        if (typeof repoInfo === 'string') {
          return repoInfo;
        }
        if (repoInfo.url) {
          return repoInfo.url.replace(/^git\+/, '').replace(/\.git$/, '');
        }
      }
    } catch {
      // Ignore errors fetching from npm
    }
    return null;
  }

  /**
   * Checks whether the given extension is compatible with the currently installed server
   *
   */
  private async _checkInstallCompatibility({
    installSpec,
    pkgName,
    pkgVer,
    installType,
  }: InstallViaNpmArgs): Promise<void> {
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
}

/**
 * This is needed to ensure proper module resolution for installed extensions,
 * especially ESM ones.
 *
 * @param driverConfig - active driver extension config
 * @param pluginConfig - active plugin extension config
 * @param logger - logger instance used for non-fatal symlink errors
 * @returns resolves when symlink injection has completed for all extensions
 */
export async function injectAppiumSymlinks(
  driverConfig: ExtensionConfig<any>,
  pluginConfig: ExtensionConfig<any>,
  logger: AppiumLogger
): Promise<void> {
  const isNpmInstalledExtension = (
    details: InstalledExtensionLike
  ): details is InstalledExtensionLike & {installType: typeof INSTALL_TYPE_NPM; installPath: string} =>
    details.installType === INSTALL_TYPE_NPM && Boolean(details.installPath);

  const installedExtensions = [
    ...Object.values(driverConfig.installedExtensions || {}),
    ...Object.values(pluginConfig.installedExtensions || {}),
  ] as InstalledExtensionLike[];

  const installPaths = _.compact(installedExtensions
    .filter((details): details is InstalledExtensionLike => Boolean(details))
    .filter(isNpmInstalledExtension)
    .map((details) => details.installPath));
  // After the extension is installed, we try to inject the appium module symlink
  // into the extension's node_modules folder if it is not there yet.
  // We also inject the symlink into other installed extensions' node_modules folders
  // as these might be cleaned up unexpectedly by npm
  // (see https://github.com/appium/python-client/pull/1177#issuecomment-3419826643).
  await Promise.all(
    installPaths.map((installPath) => injectAppiumSymlink(path.join(installPath, 'node_modules'), logger))
  );
}

/**
 * This is needed to ensure proper module resolution for installed extensions,
 * especially ESM ones.
 *
 * @param dstFolder The destination folder where the symlink should be created
 */
async function injectAppiumSymlink(dstFolder: string, logger: AppiumLogger) {
  let appiumModuleRoot = '';
  try {
    appiumModuleRoot = getAppiumModuleRoot();
    const symlinkPath = path.join(dstFolder, path.basename(appiumModuleRoot));
    if (await fs.exists(dstFolder) && !(await fs.exists(symlinkPath))) {
      await fs.symlink(appiumModuleRoot, symlinkPath, system.isWindows() ? 'junction' : 'dir');
    }
  } catch (error) {
    // This error is not fatal, we may still doing just fine if the module being loaded is a CJS one
    logger.info(
      `Cannot create a symlink to the appium module '${appiumModuleRoot}' in '${dstFolder}'. ` +
      `Original error: ${error.message}`
    );
  }
}

/**
 * Options for {@linkcode ExtensionCliCommand._run}.
 */
type RunOptions = {
  installSpec: string;
  scriptName?: string;
  extraArgs?: string[];
  bufferOutput?: boolean;
};

/**
 * Options for {@linkcode ExtensionCliCommand.doctor}.
 */
type DoctorOptions = {installSpec: string};

/**
 * Return value of {@linkcode ExtensionCliCommand._run}
 */
type RunOutput = {output?: string[]};

/**
 * Options for {@linkcode ExtensionCliCommand._update}.
 */
type ExtensionUpdateOpts = {installSpec: string; unsafe: boolean};

/**
 * Part of result of {@linkcode ExtensionCliCommand._update}.
 */
type UpdateReport = {from: string; to: string | null};

/**
 * Return value of {@linkcode ExtensionCliCommand._update}.
 */
type ExtensionUpdateResult = {errors: Record<string, Error>; updates: Record<string, UpdateReport>};

/**
 * Options for {@linkcode ExtensionCliCommand._uninstall}.
 */
type UninstallOpts = {installSpec: string};

/**
 * Used by {@linkcode ExtensionCliCommand.getPostInstallText}
 */
type ExtensionArgs = {extName: string; extData: Record<string, any>};

/**
 * Options for {@linkcode ExtensionCliCommand.installViaNpm}
 */
type InstallViaNpmArgs = {
  installSpec: string;
  pkgName: string;
  installType: InstallType;
  pkgVer?: string;
};

/**
 * Object returned by {@linkcode ExtensionCliCommand.checkForExtensionUpdate}
 */
type PossibleUpdates = {current: string; safeUpdate: string | null; unsafeUpdate: string | null};

/**
 * Options for {@linkcode ExtensionCliCommand._install}
 */
type InstallOpts = {installSpec: string; installType: InstallType; packageName?: string};

type ListOptions = {showInstalled: boolean; showUpdates: boolean; verbose?: boolean};

type GetInstallationReceiptOpts = {
  installPath: string;
  installSpec: string;
  pkg: ExtPackageJson<ExtensionType>;
  installType: InstallType;
};

type InstalledExtensionLike = {installType?: InstallType; installPath?: string};

export default ExtensionCliCommand;
export {ExtensionCliCommand as ExtensionCommand};


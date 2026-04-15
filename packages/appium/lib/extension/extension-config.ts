import type {ExtensionType} from '@appium/types';
import type {ExtClass, ExtManifest, ExtName, ExtRecord, InstallType} from 'appium/types';
import type {SchemaObject} from 'ajv';
import {util, fs, system} from '@appium/support';
import B from 'bluebird';
import _ from 'lodash';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import resolveFrom from 'resolve-from';
import {satisfies} from 'semver';
import {commandClasses} from '../cli/extension';
import type {
  ExtensionList,
  ExtensionListData,
  InstalledExtensionListData,
} from '../cli/extension-command';
import type {ExtCommand} from '../cli/extension';
import {APPIUM_VER} from '../helpers/build';
import {log} from '../logger';
import {
  ALLOWED_SCHEMA_EXTENSIONS,
  isAllowedSchemaFileExtension,
  registerSchema,
} from '../schema/schema';
import type {Manifest} from './manifest';

const DEFAULT_ENTRY_POINT = 'index.js';
/**
 * "npm" install type
 * Used when extension was installed by npm package name
 * @remarks _All_ extensions are installed _by_ `npm`, but only this one means the package name was
 * used to specify it
 */
export const INSTALL_TYPE_NPM = 'npm';
/**
 * "local" install type
 * Used when extension was installed from a local path
 */
export const INSTALL_TYPE_LOCAL = 'local';
/**
 * "github" install type
 * Used when extension was installed via GitHub URL
 */
export const INSTALL_TYPE_GITHUB = 'github';
/**
 * "git" install type
 * Used when extensions was installed via Git URL
 */
export const INSTALL_TYPE_GIT = 'git';
/**
 * "dev" install type
 * Used when automatically detected as a working copy
 */
export const INSTALL_TYPE_DEV = 'dev';

export const INSTALL_TYPES = new Set<InstallType>([
  INSTALL_TYPE_GIT,
  INSTALL_TYPE_GITHUB,
  INSTALL_TYPE_LOCAL,
  INSTALL_TYPE_NPM,
  INSTALL_TYPE_DEV,
]);

export type ExtManifestProblem = {err: string; val: unknown};

export type ExtManifestWithSchema<E extends ExtensionType> = ExtManifest<E> & {
  schema: NonNullable<ExtManifest<E>['schema']>;
};

export type ExtensionConfigMutationOpts = {write?: boolean};

/**
 * Shared configuration and validation for installed Appium extensions (drivers or plugins).
 * Subclasses fix the extension kind; do not instantiate this class directly.
 */
export abstract class ExtensionConfig<ExtType extends ExtensionType> {
  readonly extensionType: ExtType;
  readonly manifest: Manifest;
  installedExtensions: ExtRecord<ExtType>;
  #listDataCache: ExtensionList<ExtType> | undefined;

  protected constructor(extensionType: ExtType, manifest: Manifest) {
    this.extensionType = extensionType;
    this.manifest = manifest;
    this.installedExtensions = manifest.getExtensionData(extensionType);
  }

  /** Path to `extensions.yaml` after the manifest has been read; otherwise undefined. */
  get manifestPath(): string | undefined {
    return this.manifest.manifestPath;
  }

  /** `APPIUM_HOME` directory this config is tied to. */
  get appiumHome(): string {
    return this.manifest.appiumHome;
  }

  /**
   * Type guard: manifest entry includes a `schema` path or inline schema object.
   *
   * @param extManifest - Parsed extension metadata
   */
  static extDataHasSchema<E extends ExtensionType>(
    extManifest: ExtManifest<E>
  ): extManifest is ExtManifestWithSchema<E> {
    return _.isString(extManifest?.schema) || _.isObject(extManifest?.schema);
  }

  private static async _readExtensionSchema<E extends ExtensionType>(
    appiumHome: string,
    extType: E,
    extName: string,
    extManifest: ExtManifestWithSchema<E>
  ): Promise<SchemaObject | undefined> {
    const {pkgName, schema: argSchemaPath} = extManifest;
    if (!argSchemaPath) {
      throw new TypeError(
        `No \`schema\` property found in config for ${extType} ${pkgName} -- why is this function being called?`
      );
    }
    let moduleObject: any;
    if (_.isString(argSchemaPath)) {
      const schemaPath = resolveFrom(appiumHome, path.join(pkgName, argSchemaPath));
      moduleObject = require(schemaPath);
    } else {
      moduleObject = argSchemaPath;
    }
    // this sucks. default exports should be destroyed
    const schema = moduleObject.__esModule ? moduleObject.default : moduleObject;
    await registerSchema(extType, extName, schema as SchemaObject);
    return schema;
  }

  /**
   * Collects blocking validation issues for one extension (generic fields, type-specific rules, and schema).
   *
   * @param extName - Extension key as stored in the manifest
   * @param extManifest - Manifest entry for that extension
   */
  async getProblems(extName: string, extManifest: ExtManifest<ExtType>): Promise<ExtManifestProblem[]> {
    return [
      ...this.getGenericConfigProblems(extManifest, extName),
      ...this.getConfigProblems(extManifest, extName),
      ...(await this.getSchemaProblems(extManifest, extName)),
    ];
  }

  /**
   * Collects non-fatal issues for one extension (e.g. manifest quirks, peer dependency mismatches).
   * Warnings do not by themselves prevent loading.
   *
   * @param extName - Extension key as stored in the manifest
   * @param extManifest - Manifest entry for that extension
   */
  async getWarnings(extName: string, extManifest: ExtManifest<ExtType>): Promise<string[]> {
    const [genericConfigWarnings, configWarnings] = await B.all([
      this.getGenericConfigWarnings(extManifest, extName),
      this.getConfigWarnings(extManifest, extName),
    ]);

    return [...genericConfigWarnings, ...configWarnings];
  }

  /**
   * Turns per-extension errors and warnings into human-readable log lines for console output.
   *
   * @param errorMap - Extension name to list of blocking problems
   * @param warningMap - Extension name to list of warning strings
   */
  getValidationResultSummaries(
    errorMap: Map<string, ExtManifestProblem[]> = new Map(),
    warningMap: Map<string, string[]> = new Map()
  ): {errorSummaries: string[]; warningSummaries: string[]} {
    const errorSummaries: string[] = [];
    for (const [extName, problems] of errorMap.entries()) {
      if (_.isEmpty(problems)) {
        continue;
      }
      // remove this extension from the list since it's not valid
      errorSummaries.push(
        `${this.extensionType} "${extName}" had ${util.pluralize(
          'error',
          problems.length
        )} and will not be available:`
      );
      for (const problem of problems) {
        errorSummaries.push(
          `  - ${problem.err} (Actual value: ` + `${JSON.stringify(problem.val)})`
        );
      }
    }
    const warningSummaries: string[] = [];
    for (const [extName, warnings] of warningMap.entries()) {
      if (_.isEmpty(warnings)) {
        continue;
      }
      const extTypeText = _.capitalize(this.extensionType);
      const problemEnumerationText = util.pluralize('potential problem', warnings.length, true);
      warningSummaries.push(`${extTypeText} "${extName}" has ${problemEnumerationText}: `);
      for (const warning of warnings) {
        warningSummaries.push(`  - ${warning}`);
      }
    }

    return {errorSummaries, warningSummaries};
  }

  /**
   * Records a new installed extension in the manifest and optionally persists immediately.
   *
   * @param extName - Manifest key for the extension
   * @param extManifest - Full manifest payload
   *
   * Pass `{ write: false }` to defer flushing until a later manifest write.
   */
  async addExtension(
    extName: string,
    extManifest: ExtManifest<ExtType>,
    {write = true}: ExtensionConfigMutationOpts = {}
  ): Promise<void> {
    this.manifest.setExtension(this.extensionType, extName, extManifest);
    if (write) {
      await this.manifest.write();
    }
  }

  /**
   * Merges new metadata into an existing extension entry and optionally writes the manifest.
   *
   * @param extName - Installed extension to update
   * @param extManifest - Fields to merge over the current entry
   *
   * Pass `{ write: false }` to defer flushing until a later manifest write.
   */
  async updateExtension(
    extName: ExtName<ExtType>,
    extManifest: ExtManifest<ExtType>,
    {write = true}: ExtensionConfigMutationOpts = {}
  ): Promise<void> {
    const existing = this.installedExtensions[extName];
    this.manifest.setExtension(this.extensionType, extName as string, {
      ...existing,
      ...extManifest,
    });
    if (write) {
      await this.manifest.write();
    }
  }

  /**
   * Drops an extension from the manifest and optionally persists immediately.
   *
   * @param extName - Installed extension to remove
   *
   * Pass `{ write: false }` to defer flushing until a later manifest write.
   */
  async removeExtension(
    extName: ExtName<ExtType>,
    {write = true}: ExtensionConfigMutationOpts = {}
  ): Promise<void> {
    this.manifest.deleteExtension(this.extensionType, extName);
    if (write) {
      await this.manifest.write();
    }
  }

  /**
   * Logs installed extensions to the console. Subclasses may use `activeNames` to annotate active plugins.
   */
  print(_activeNames?: ExtName<ExtType>[]): void {
    void _activeNames;
    if (_.isEmpty(this.installedExtensions)) {
      log.info(
        `No ${this.extensionType}s have been installed in ${this.appiumHome}. Use the "appium ${this.extensionType}" ` +
          'command to install the one(s) you want to use.'
      );
      return;
    }

    log.info(`Available ${this.extensionType}s:`);
    for (const [extName, extManifest] of _.toPairs(this.installedExtensions) as Array<
      [string, ExtManifest<ExtType>]
    >) {
      log.info(`  - ${this.extensionDesc(extName, extManifest)}`);
    }
  }

  /**
   * Root directory of an installed extension, preferring `installPath` and falling back to `node_modules/<pkgName>`.
   *
   * @param extName - Installed extension key
   */
  getInstallPath(extName: keyof ExtRecord<ExtType> & string): string {
    return (
      this.installedExtensions[extName]?.installPath ??
      path.join(this.appiumHome, 'node_modules', this.installedExtensions[extName].pkgName)
    );
  }

  /**
   * Dynamically imports the extension entry point and returns the exported main class constructor.
   *
   * @param extName - Installed extension to load
   */
  async requireAsync(extName: ExtName<ExtType>): Promise<ExtClass<ExtType>> {
    const [reqPath, mainClass] = await this._resolveExtension(extName);
    log.debug(`Requiring ${this.extensionType} at ${reqPath}`);
    // https://github.com/nodejs/node/issues/31710
    const importPath = system.isWindows() ? pathToFileURL(reqPath).href : reqPath;
    const mod = (await import(importPath)) as Record<string, ExtClass<ExtType>>;
    const MainClass = mod[mainClass];
    if (!MainClass) {
      throw new ReferenceError(
        `Could not find a class named "${mainClass}" exported by ${this.extensionType} "${extName}"`
      );
    }
    return MainClass;
  }

  /** Whether the manifest lists an extension under the given name. */
  isInstalled(extName: string): boolean {
    return extName in this.installedExtensions;
  }

  /**
   * Loads the extension’s config schema from disk or inline JSON and registers it for CLI/config validation.
   *
   * @param extName - Extension key
   * @param extManifest - Manifest entry that includes `schema`
   */
  async readExtensionSchema(
    extName: string,
    extManifest: ExtManifestWithSchema<ExtType>
  ): Promise<SchemaObject | undefined> {
    return await ExtensionConfig._readExtensionSchema(
      this.appiumHome,
      this.extensionType,
      extName,
      extManifest
    );
  }

  /** Optional async warnings for this extension kind; override in subclasses when needed. */
  protected async getConfigWarnings(
    _extManifest: ExtManifest<ExtType>,
    _extName: string
  ): Promise<string[]> {
    void _extManifest;
    void _extName;
    return [];
  }

  /**
   * Validates all entries in `exts`, logs summaries, and removes keys that have blocking errors.
   * Intended for subclasses’ `validate` implementation.
   */
  protected async _validate(exts: ExtRecord<ExtType>): Promise<ExtRecord<ExtType>> {
    const errorMap = new Map<string, ExtManifestProblem[]>();
    const warningMap = new Map<string, string[]>();

    for (const [extName, extManifest] of _.toPairs(exts)) {
      const [errors, warnings] = await B.all([
        this.getProblems(extName, extManifest),
        this.getWarnings(extName, extManifest),
      ]);
      if (errors.length) {
        delete exts[extName];
      }
      errorMap.set(extName, errors);
      warningMap.set(extName, warnings);
    }

    const {errorSummaries, warningSummaries} = this.getValidationResultSummaries(
      errorMap,
      warningMap
    );

    if (!_.isEmpty(errorSummaries)) {
      log.error(
        `Appium encountered ${util.pluralize('error', errorMap.size, true)} while validating ${
          this.extensionType
        }s found in manifest ${this.manifestPath}`
      );
      for (const summary of errorSummaries) {
        log.error(summary);
      }
    } else if (!_.isEmpty(warningSummaries)) {
      // only display warnings if there are no errors!
      log.warn(
        `Appium encountered ${util.pluralize(
          'warning',
          warningMap.size,
          true
        )} while validating ${this.extensionType}s found in manifest ${this.manifestPath}`
      );
      for (const summary of warningSummaries) {
        log.warn(summary);
      }
    }
    return exts;
  }

  /**
   * Fetches `appium driver|plugin list`-style data via the CLI command class; result is cached.
   */
  protected async getListData(): Promise<ExtensionList<ExtType>> {
    if (this.#listDataCache) {
      return this.#listDataCache;
    }
    const CommandClass = commandClasses[this.extensionType] as ExtCommand<ExtType>;
    const cmd = new CommandClass({config: this, json: true});
    const listData = await cmd.list({showInstalled: true, showUpdates: true});
    this.#listDataCache = listData;
    return listData;
  }

  /**
   * Warnings about manifest install fields and Appium peer dependency compatibility for one extension.
   */
  protected async getGenericConfigWarnings(
    extManifest: ExtManifest<ExtType>,
    extName: string
  ): Promise<string[]> {
    const {appiumVersion, installSpec, installType, pkgName} = extManifest;
    const warnings: string[] = [];

    const invalidFields: string[] = [];
    if (!_.isString(installSpec)) {
      invalidFields.push('installSpec');
    }

    if (!INSTALL_TYPES.has(installType)) {
      invalidFields.push('installType');
    }

    const extTypeText = _.capitalize(this.extensionType);

    if (invalidFields.length) {
      const invalidFieldsEnumerationText = util.pluralize(
        'invalid or missing field',
        invalidFields.length,
        true
      );
      const invalidFieldsText = invalidFields.map((field) => `"${field}"`).join(', ');

      warnings.push(
        `${extTypeText} "${extName}" (package \`${pkgName}\`) has ${invalidFieldsEnumerationText} (${invalidFieldsText}) in \`extensions.yaml\`; ` +
        `this may cause upgrades done via the \`appium\` CLI tool to fail. Please reinstall with \`appium ${this.extensionType} uninstall ` +
        `${extName}\` and \`appium ${this.extensionType} install ${extName}\` to attempt a fix.`
      );
    }

    const createPeerWarning = (reason: string): string =>
      `${extTypeText} "${extName}" (package \`${pkgName}\`) may be incompatible with the current version of Appium (v${APPIUM_VER}) due to ${reason}`;

    if (_.isString(appiumVersion) && !satisfies(APPIUM_VER, appiumVersion)) {
      const listData = await this.getListData();
      const extListData = listData[extName] as ExtensionListData<ExtType> | undefined;
      if (extListData?.installed) {
        const {updateVersion, upToDate} = extListData;
        if (!upToDate && updateVersion) {
          warnings.push(
            createPeerWarning(
              `its peer dependency on Appium ${appiumVersion}. Try to upgrade \`${pkgName}\` to v${updateVersion} or newer.`
            )
          );
        } else {
          warnings.push(
            createPeerWarning(
              `its peer dependency on Appium ${appiumVersion}. Please install a compatible version of the ${_.toLower(extTypeText)}.`
            )
          );
        }
      }
    } else if (!_.isString(appiumVersion)) {
      const listData = await this.getListData();
      const extListData = listData[extName] as InstalledExtensionListData<ExtType> | undefined;
      if (!extListData?.upToDate && extListData?.updateVersion) {
        warnings.push(
          createPeerWarning(
            `an invalid or missing peer dependency on Appium. A newer version of \`${pkgName}\` is available; ` +
            `please attempt to upgrade "${extName}" to v${extListData.updateVersion} or newer.`
          )
        );
      } else {
        warnings.push(
          createPeerWarning(
            `an invalid or missing peer dependency on Appium. ` +
            `Please ask the developer of \`${pkgName}\` to add a peer dependency on \`^appium@${APPIUM_VER}\`.`
          )
        );
      }
    }
    return warnings;
  }

  /** Validates and registers extension CLI/config schema when the manifest defines a `schema` field. */
  protected async getSchemaProblems(
    extManifest: ExtManifest<ExtType>,
    extName: string
  ): Promise<ExtManifestProblem[]> {
    const problems: ExtManifestProblem[] = [];
    const {schema: argSchemaPath} = extManifest;
    if (ExtensionConfig.extDataHasSchema(extManifest)) {
      if (_.isString(argSchemaPath)) {
        if (isAllowedSchemaFileExtension(argSchemaPath)) {
          try {
            await this.readExtensionSchema(extName, extManifest);
          } catch (err: any) {
            problems.push({
              err: `Unable to register schema at path ${argSchemaPath}; ${err.message}`,
              val: argSchemaPath,
            });
          }
        } else {
          problems.push({
            err: `Schema file has unsupported extension. Allowed: ${[
              ...ALLOWED_SCHEMA_EXTENSIONS,
            ].join(', ')}`,
            val: argSchemaPath,
          });
        }
      } else if (_.isPlainObject(argSchemaPath)) {
        try {
          await this.readExtensionSchema(extName, extManifest);
        } catch (err: any) {
          problems.push({
            err: `Unable to register embedded schema; ${err.message}`,
            val: argSchemaPath,
          });
        }
      } else {
        problems.push({
          err: 'Incorrectly formatted schema field; must be a path to a schema file or a schema object.',
          val: argSchemaPath,
        });
      }
    }
    return problems;
  }

  /** Blocking issues for required manifest fields shared by all extensions (version, package name, main class). */
  protected getGenericConfigProblems(
    extManifest: ExtManifest<ExtType>,
    extName: string
  ): ExtManifestProblem[] {
    void extName;
    const {version, pkgName, mainClass} = extManifest;
    const problems: ExtManifestProblem[] = [];

    if (!_.isString(version)) {
      problems.push({
        err: `Invalid or missing \`version\` field in my \`package.json\` and/or \`extensions.yaml\` (must be a string)`,
        val: version,
      });
    }

    if (!_.isString(pkgName)) {
      problems.push({
        err: `Invalid or missing \`name\` field in my \`package.json\` and/or \`extensions.yaml\` (must be a string)`,
        val: pkgName,
      });
    }

    if (!_.isString(mainClass)) {
      problems.push({
        err: `Invalid or missing \`appium.mainClass\` field in my \`package.json\` and/or \`mainClass\` field in \`extensions.yaml\` (must be a string)`,
        val: mainClass,
      });
    }

    return problems;
  }

  /** Driver- or plugin-specific blocking validation; override in subclasses when needed. */
  protected getConfigProblems(
    _extManifest: ExtManifest<ExtType>,
    _extName: string
  ): ExtManifestProblem[] {
    void _extManifest;
    void _extName;
    return [];
  }

  private async _resolveExtension(extName: ExtName<ExtType>): Promise<[string, string]> {
    const {mainClass} = this.installedExtensions[extName];
    const moduleRoot = this.getInstallPath(extName);
    const packageJsonPath = path.join(moduleRoot, 'package.json');
    let extensionManifest: Record<string, any>;
    try {
      extensionManifest = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    } catch (e: any) {
      throw new ReferenceError(
        `Could not read the ${this.extensionType} manifest at ${packageJsonPath}: ${e.message}`
      );
    }
    let entryPointRelativePath: string | undefined;
    try {
      if (extensionManifest.type === 'module' && extensionManifest.exports) {
        entryPointRelativePath = resolveEsmEntryPoint(extensionManifest.exports);
      }
      entryPointRelativePath = entryPointRelativePath ?? extensionManifest.main ?? DEFAULT_ENTRY_POINT;
    } catch (e: any) {
      throw new ReferenceError(
        `Could not find the ${this.extensionType} installed at ${moduleRoot}: ${e.message}`
      );
    }
    const entryPointFullPath = path.resolve(moduleRoot, entryPointRelativePath as string);
    if (!await fs.exists(entryPointFullPath)) {
      throw new ReferenceError(
        `Cannot find a valid ${this.extensionType} main entry point in '${packageJsonPath}'. ` +
        `Assumed entry point: '${entryPointFullPath}'`
      );
    }
    // note: this will only reload the entry point
    if (process.env.APPIUM_RELOAD_EXTENSIONS && require.cache[entryPointFullPath]) {
      log.debug(`Removing ${entryPointFullPath} from require cache`);
      delete require.cache[entryPointFullPath];
    }
    return [entryPointFullPath, mainClass];
  }

  /**
   * One-line human description for list output; implemented per extension kind.
   *
   * @param extName - Manifest key
   * @param extManifest - Entry used for version and kind-specific labels
   */
  public abstract extensionDesc(extName: ExtName<ExtType>, extManifest: ExtManifest<ExtType>): string;

}

/**
 * Resolves a package `exports` field (string, `"."`, or `"import"`) to a relative entry path for ESM packages.
 *
 * @param exportsValue - `package.json` `exports` value or nested fragment
 */
export function resolveEsmEntryPoint(exportsValue: unknown): string | undefined {
  if (_.isString(exportsValue) && exportsValue) {
    return exportsValue;
  }
  if (!_.isPlainObject(exportsValue)) {
    return;
  }

  const obj = exportsValue as Record<string, unknown>;
  for (const key of ['.', 'import'] as const) {
    if (obj[key]) {
      return resolveEsmEntryPoint(obj[key]);
    }
  }
}

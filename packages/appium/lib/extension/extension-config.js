import _ from 'lodash';
import path from 'path';
import resolveFrom from 'resolve-from';
import log from '../logger';
import {
  ALLOWED_SCHEMA_EXTENSIONS,
  isAllowedSchemaFileExtension,
  registerSchema,
} from '../schema/schema';

const INSTALL_TYPE_NPM = 'npm';
const INSTALL_TYPE_LOCAL = 'local';
const INSTALL_TYPE_GITHUB = 'github';
const INSTALL_TYPE_GIT = 'git';

/** @type {Set<InstallType>} */
const INSTALL_TYPES = new Set([
  INSTALL_TYPE_GIT,
  INSTALL_TYPE_GITHUB,
  INSTALL_TYPE_LOCAL,
  INSTALL_TYPE_NPM,
]);

/**
 * This class is abstract. It should not be instantiated directly.
 *
 * Subclasses should provide the generic parameter to implement.
 * @template {ExtensionType} ExtType
 */
export class ExtensionConfig {
  /** @type {ExtType} */
  extensionType;

  /** @type {`${ExtType}s`} */
  configKey;

  /** @type {ExtRecord<ExtType>} */
  installedExtensions;

  /** @type {ExtensionLogFn} */
  log;

  /** @type {Manifest} */
  manifest;

  /**
   * @protected
   * @param {ExtType} extensionType - Type of extension
   * @param {Manifest} manifest - `Manifest` instance
   * @param {ExtensionLogFn} [logFn]
   */
  constructor(extensionType, manifest, logFn) {
    const logger = _.isFunction(logFn) ? logFn : log.error.bind(log);
    this.extensionType = extensionType;
    this.configKey = `${extensionType}s`;
    this.installedExtensions = manifest.getExtensionData(extensionType);
    this.log = logger;
    this.manifest = manifest;
  }

  get manifestPath() {
    return this.manifest.manifestPath;
  }

  get appiumHome() {
    return this.manifest.appiumHome;
  }

  /**
   * Checks extensions for problems
   * @param {ExtRecord<ExtType>} exts - Extension data
   */
  validate(exts) {
    const foundProblems =
      /** @type {Record<ExtName<ExtType>,Problem[]>} */ ({});
    for (const [
      extName,
      extData,
    ] of /** @type {[ExtName<ExtType>, ExtManifest<ExtType>][]} */ (
      _.toPairs(exts)
    )) {
      foundProblems[extName] = [
        ...this.getGenericConfigProblems(extData, extName),
        ...this.getConfigProblems(extData),
        ...this.getSchemaProblems(extData, extName),
      ];
    }

    const problemSummaries = [];
    for (const [extName, problems] of _.toPairs(foundProblems)) {
      if (_.isEmpty(problems)) {
        continue;
      }
      // remove this extension from the list since it's not valid
      delete exts[extName];
      problemSummaries.push(
        `${this.extensionType} ${extName} had errors and will not ` +
          `be available. Errors:`
      );
      for (const problem of problems) {
        problemSummaries.push(
          `  - ${problem.err} (Actual value: ` +
            `${JSON.stringify(problem.val)})`
        );
      }
    }

    if (!_.isEmpty(problemSummaries)) {
      this.log(
        `Appium encountered one or more errors while validating ` +
          `the ${this.configKey} extension file (${this.manifestPath}):`
      );
      for (const summary of problemSummaries) {
        this.log(summary);
      }
    }

    return exts;
  }

  /**
   * @param {ExtManifest<ExtType>} extData
   * @param {ExtName<ExtType>} extName
   * @returns {Problem[]}
   */
  getSchemaProblems(extData, extName) {
    const problems = [];
    const {schema: argSchemaPath} = extData;
    if (ExtensionConfig.extDataHasSchema(extData)) {
      if (_.isString(argSchemaPath)) {
        if (isAllowedSchemaFileExtension(argSchemaPath)) {
          try {
            this.readExtensionSchema(extName, extData);
          } catch (err) {
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
          this.readExtensionSchema(extName, extData);
        } catch (err) {
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

  /**
   * @param {ExtManifest<ExtType>} extData
   * @param {ExtName<ExtType>} extName
   * @returns {Problem[]}
   */
  // eslint-disable-next-line no-unused-vars
  getGenericConfigProblems(extData, extName) {
    const {version, pkgName, installSpec, installType, mainClass} = extData;
    const problems = [];

    if (!_.isString(version)) {
      problems.push({err: 'Missing or incorrect version', val: version});
    }

    if (!_.isString(pkgName)) {
      problems.push({
        err: 'Missing or incorrect NPM package name',
        val: pkgName,
      });
    }

    if (!_.isString(installSpec)) {
      problems.push({
        err: 'Missing or incorrect installation spec',
        val: installSpec,
      });
    }

    if (!INSTALL_TYPES.has(installType)) {
      problems.push({
        err: 'Missing or incorrect install type',
        val: installType,
      });
    }

    if (!_.isString(mainClass)) {
      problems.push({
        err: 'Missing or incorrect driver class name',
        val: mainClass,
      });
    }

    return problems;
  }

  /**
   * @abstract
   * @param {ExtManifest<ExtType>} extData
   * @returns {Problem[]}
   */
  // eslint-disable-next-line no-unused-vars
  getConfigProblems(extData) {
    // shoud override this method if special validation is necessary for this extension type
    return [];
  }

  /**
   * @param {string} extName
   * @param {ExtManifest<ExtType>} extData
   * @param {ExtensionConfigMutationOpts} [opts]
   * @returns {Promise<void>}
   */
  async addExtension(extName, extData, {write = true} = {}) {
    this.manifest.addExtension(this.extensionType, extName, extData);
    if (write) {
      await this.manifest.write();
    }
  }

  /**
   * @param {ExtName<ExtType>} extName
   * @param {ExtManifest<ExtType>|import('../cli/extension-command').ExtensionFields<ExtType>} extData
   * @param {ExtensionConfigMutationOpts} [opts]
   * @returns {Promise<void>}
   */
  async updateExtension(extName, extData, {write = true} = {}) {
    this.installedExtensions[extName] = {
      ...this.installedExtensions[extName],
      ...extData,
    };
    if (write) {
      await this.manifest.write();
    }
  }

  /**
   * @param {ExtName<ExtType>} extName
   * @param {ExtensionConfigMutationOpts} [opts]
   * @returns {Promise<void>}
   */
  async removeExtension(extName, {write = true} = {}) {
    delete this.installedExtensions[extName];
    if (write) {
      await this.manifest.write();
    }
  }

  /**
   * @param {ExtName<ExtType>[]} [activeNames]
   * @returns {void}
   */
  // eslint-disable-next-line no-unused-vars
  print(activeNames) {
    if (_.isEmpty(this.installedExtensions)) {
      log.info(
        `No ${this.configKey} have been installed in ${this.appiumHome}. Use the "appium ${this.extensionType}" ` +
          'command to install the one(s) you want to use.'
      );
      return;
    }

    log.info(`Available ${this.configKey}:`);
    for (const [
      extName,
      extData,
    ] of /** @type {[string, ExtManifest<ExtType>][]} */ (
      _.toPairs(this.installedExtensions)
    )) {
      log.info(`  - ${this.extensionDesc(extName, extData)}`);
    }
  }

  /**
   * Returns a string describing the extension. Subclasses must implement.
   * @param {ExtName<ExtType>} extName - Extension name
   * @param {ExtManifest<ExtType>} extData - Extension data
   * @returns {string}
   * @abstract
   */
  // eslint-disable-next-line no-unused-vars
  extensionDesc(extName, extData) {
    throw new Error('This must be implemented in a subclass');
  }

  /**
   * @param {string} extName
   * @returns {string}
   */
  getInstallPath(extName) {
    return path.join(
      this.appiumHome,
      'node_modules',
      this.installedExtensions[extName].pkgName
    );
  }

  /**
   * Loads extension and returns its main class (constructor)
   * @param {ExtName<ExtType>} extName
   * @returns {ExtClass<ExtType>}
   */
  require(extName) {
    const {mainClass} = this.installedExtensions[extName];
    const reqPath = this.getInstallPath(extName);
    const reqResolved = require.resolve(reqPath);
    // note: this will only reload the entry point
    if (process.env.APPIUM_RELOAD_EXTENSIONS && require.cache[reqResolved]) {
      log.debug(`Removing ${reqResolved} from require cache`);
      delete require.cache[reqResolved];
    }
    log.debug(`Requiring ${this.extensionType} at ${reqPath}`);
    return require(reqPath)[mainClass];
  }

  /**
   * @param {string} extName
   * @returns {boolean}
   */
  isInstalled(extName) {
    return _.includes(Object.keys(this.installedExtensions), extName);
  }

  /**
   * Intended to be called by corresponding instance methods of subclass.
   * @private
   * @template {ExtensionType} ExtType
   * @param {string} appiumHome
   * @param {ExtType} extType
   * @param {ExtName<ExtType>} extName - Extension name (unique to its type)
   * @param {ExtManifestWithSchema<ExtType>} extData - Extension config
   * @returns {import('ajv').SchemaObject|undefined}
   */
  static _readExtensionSchema(appiumHome, extType, extName, extData) {
    const {pkgName, schema: argSchemaPath} = extData;
    if (!argSchemaPath) {
      throw new TypeError(
        `No \`schema\` property found in config for ${extType} ${pkgName} -- why is this function being called?`
      );
    }
    let moduleObject;
    if (_.isString(argSchemaPath)) {
      const schemaPath = resolveFrom(
        appiumHome,
        path.join(pkgName, argSchemaPath)
      );
      moduleObject = require(schemaPath);
    } else {
      moduleObject = argSchemaPath;
    }
    // this sucks. default exports should be destroyed
    const schema = moduleObject.__esModule
      ? moduleObject.default
      : moduleObject;
    registerSchema(extType, extName, schema);
    return schema;
  }

  /**
   * Returns `true` if a specific {@link ExtManifest} object has a `schema` prop.
   * The {@link ExtManifest} object becomes a {@link ExtManifestWithSchema} object.
   * @template {ExtensionType} ExtType
   * @param {ExtManifest<ExtType>} extData
   * @returns {extData is ExtManifestWithSchema<ExtType>}
   */
  static extDataHasSchema(extData) {
    return _.isString(extData?.schema) || _.isObject(extData?.schema);
  }

  /**
   * If an extension provides a schema, this will load the schema and attempt to
   * register it with the schema registrar.
   * @param {ExtName<ExtType>} extName - Name of extension
   * @param {ExtManifestWithSchema<ExtType>} extData - Extension data
   * @returns {import('ajv').SchemaObject|undefined}
   */
  readExtensionSchema(extName, extData) {
    return ExtensionConfig._readExtensionSchema(
      this.appiumHome,
      this.extensionType,
      extName,
      extData
    );
  }
}

export {
  INSTALL_TYPE_NPM,
  INSTALL_TYPE_GIT,
  INSTALL_TYPE_LOCAL,
  INSTALL_TYPE_GITHUB,
  INSTALL_TYPES,
};

/**
 * Config problem
 * @typedef Problem
 * @property {string} err - Error message
 * @property {any} val - Associated value
 */

/**
 * An optional logging function provided to an {@link ExtensionConfig} subclass.
 * @callback ExtensionLogFn
 * @param {...any} args
 * @returns {void}
 */

/**
 * @typedef {import('appium/types').ExtensionType} ExtensionType
 * @typedef {import('./manifest').Manifest} Manifest
 */

/**
 * @template T
 * @typedef {import('appium/types').ExtManifest<T>} ExtManifest
 */

/**
 * @template T
 * @typedef {import('appium/types').ExtManifestWithSchema<T>} ExtManifestWithSchema
 */

/**
 * @template T
 * @typedef {import('appium/types').ExtName<T>} ExtName
 */

/**
 * @template T
 * @typedef {import('appium/types').ExtClass<T>} ExtClass
 */

/**
 * @template T
 * @typedef {import('appium/types').ExtRecord<T>} ExtRecord
 */

/**
 * Options for various methods in {@link ExtensionConfig}
 * @typedef ExtensionConfigMutationOpts
 * @property {boolean} [write=true] Whether or not to write the manifest to disk after a mutation operation
 */

/**
 * A valid install type
 * @typedef {typeof INSTALL_TYPE_NPM | typeof INSTALL_TYPE_GIT | typeof INSTALL_TYPE_LOCAL | typeof INSTALL_TYPE_GITHUB} InstallType
 */

import _ from 'lodash';
import ExtensionCliCommand from './extension-command';
import {KNOWN_DRIVERS} from '../constants';
import '@colors/colors';

const REQ_DRIVER_FIELDS = ['driverName', 'automationName', 'platformNames', 'mainClass'];

/**
 * @extends {ExtensionCliCommand<DriverType>}
 */

export default class DriverCliCommand extends ExtensionCliCommand {
  /**
   * @param {import('./extension-command').ExtensionCommandOptions<DriverType>} opts
   */
  constructor({config, json}) {
    super({config, json});
    this.knownExtensions = KNOWN_DRIVERS;
  }

  /**
   * Install a driver
   *
   * @param {DriverInstallOpts} opts
   * @return {Promise<ExtRecord<DriverType>>}
   */
  async install({driver, installType, packageName}) {
    return await super._install({
      installSpec: driver,
      installType,
      packageName,
    });
  }

  /**
   * Uninstall a driver
   *
   * @param {DriverUninstallOpts} opts
   * @return {Promise<ExtRecord<DriverType>>}
   */
  async uninstall({driver}) {
    return await super._uninstall({installSpec: driver});
  }

  /**
   * Update a driver
   *
   * @param {DriverUpdateOpts} opts
   * @return {Promise<import('./extension-command').ExtensionUpdateResult>}
   */
  async update({driver, unsafe}) {
    return await super._update({installSpec: driver, unsafe});
  }

  /**
   *
   * @param {DriverRunOptions} opts
   * @return {Promise<import('./extension-command').RunOutput>}
   */
  async run({driver, scriptName, extraArgs}) {
    return await super._run({
      installSpec: driver,
      scriptName,
      extraArgs,
      bufferOutput: this.isJsonOutput,
    });
  }

  /**
   * Runs doctor checks for the given driver.
   *
   * @param {DriverDoctorOptions} opts
   * @returns {Promise<number>} The amount of executed doctor checks.
   * @throws {Error} If any of the mandatory Doctor checks fails.
   */
  async doctor({driver}) {
    return await super._doctor({
      installSpec: driver,
    });
  }

  /**
   *
   * @param {import('./extension-command').ExtensionArgs} opts
   * @returns {string}
   */
  getPostInstallText({extName, extData}) {
    return (
      `Driver ${extName}@${extData.version} successfully installed\n`.green +
      `- automationName: ${extData.automationName.green}\n` +
      `- platformNames: ${JSON.stringify(extData.platformNames).green}`
    );
  }

  /**
   * Validates fields in `appium` field of `driverMetadata`
   *
   * For any `package.json` fields which a driver requires, validate the type of
   * those fields on the `package.json` data, throwing an error if anything is
   * amiss.
   * @param {import('appium/types').ExtMetadata<DriverType>} driverMetadata
   * @param {string} installSpec
   */
  validateExtensionFields(driverMetadata, installSpec) {
    const missingFields = REQ_DRIVER_FIELDS.reduce(
      (acc, field) => (driverMetadata[field] ? acc : [...acc, field]),
      []
    );

    if (!_.isEmpty(missingFields)) {
      throw new Error(
        `Driver "${installSpec}" did not expose correct fields for compatibility ` +
          `with Appium. Missing fields: ${JSON.stringify(missingFields)}`
      );
    }
  }
}

/**
 * @typedef {import('@appium/types').ExtensionType} ExtensionType
 * @typedef {import('@appium/types').DriverType} DriverType
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {import('appium/types').ExtRecord<ExtType>} ExtRecord
 */

/**
 * @typedef DriverCommandOptions
 * @property {import('../extension/extension-config').ExtensionConfig<DriverType>} config
 * @property {boolean} json
 */

/**
 * Options for {@linkcode DriverCliCommand.install}
 * @typedef DriverInstallOpts
 * @property {string} driver - the name or spec of a driver to install
 * @property {InstallType} installType - how to install this driver. One of the INSTALL_TYPES
 * @property {string} [packageName] - for git/github installs, the driver node package name
 */

/**
 * @typedef {import('appium/types').InstallType} InstallType
 */

/**
 * Options for {@linkcode DriverCliCommand.uninstall}
 * @typedef DriverUninstallOpts
 * @property {string} driver - the name or spec of a driver to uninstall
 */

/**
 * Options for {@linkcode DriverCliCommand.update}
 * @typedef DriverUpdateOpts
 * @property {string} driver - the name of the driver to update
 * @property {boolean} unsafe - if true, will perform unsafe updates past major revision boundaries
 */

/**
 * Options for {@linkcode DriverCliCommand.run}.
 * @typedef DriverRunOptions
 * @property {string} driver - name of the driver to run a script from
 * @property {string} scriptName - name of the script to run
 * @property {string[]} [extraArgs] - arguments to pass to the script
 */

/**
 * Options for {@linkcode DriverCliCommand.doctor}.
 * @typedef DriverDoctorOptions
 * @property {string} driver - name of the driver to run doctor checks for
 */

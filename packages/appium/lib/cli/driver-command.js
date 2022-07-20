import _ from 'lodash';
import ExtensionCommand from './extension-command';
import {KNOWN_DRIVERS} from '../constants';
import '@colors/colors';

const REQ_DRIVER_FIELDS = ['driverName', 'automationName', 'platformNames', 'mainClass'];

/**
 * @extends {ExtensionCommand<DriverType>}
 */
export default class DriverCommand extends ExtensionCommand {
  /**
   * @param {import('./extension-command').ExtensionCommandOptions<DriverType>} opts
   */
  constructor({config, json}) {
    super({config, json});
    this.knownExtensions = KNOWN_DRIVERS;
  }

  async install({driver, installType, packageName}) {
    return await super._install({
      installSpec: driver,
      installType,
      packageName,
    });
  }

  async uninstall({driver}) {
    return await super._uninstall({installSpec: driver});
  }

  async update({driver, unsafe}) {
    return await super._update({installSpec: driver, unsafe});
  }

  async run({driver, scriptName, extraArgs}) {
    return await super._run({installSpec: driver, scriptName, extraArgs});
  }

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
        `Driver "${installSpec}" did not expose correct fields for compability ` +
          `with Appium. Missing fields: ${JSON.stringify(missingFields)}`
      );
    }
  }
}

/**
 * @typedef DriverCommandOptions
 * @property {import('../extension/extension-config').ExtensionConfig<DriverType>} config
 * @property {boolean} json
 */

/**
 * @typedef {import('@appium/types').DriverType} DriverType
 */

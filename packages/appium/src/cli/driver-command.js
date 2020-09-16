import _ from 'lodash';
import ExtensionCommand from './extension-command';
import {DRIVER_TYPE} from '../extension-config';
import {KNOWN_DRIVERS} from '../drivers';

const REQ_DRIVER_FIELDS = ['driverName', 'automationName', 'platformNames', 'mainClass'];

export default class DriverCommand extends ExtensionCommand {

  constructor ({config, json}) {
    super({config, json, type: DRIVER_TYPE});
    this.knownExtensions = KNOWN_DRIVERS;
  }

  async install ({driver, installType, packageName}) {
    return await super.install({ext: driver, installType, packageName});
  }

  async uninstall ({driver}) {
    return await super.uninstall({ext: driver});
  }

  async update ({driver, unsafe}) {
    return await super.update({ext: driver, unsafe});
  }

  getPostInstallText ({extName, extData}) {
    return `Driver ${extName}@${extData.version} successfully installed\n`.green +
           `- automationName: ${extData.automationName.green}\n` +
           `- platformNames: ${JSON.stringify(extData.platformNames).green}`;
  }

  validateExtensionFields (appiumPkgData) {
    const missingFields = REQ_DRIVER_FIELDS.reduce((acc, field) => (
      appiumPkgData[field] ? acc : [...acc, field]
    ), []);

    if (!_.isEmpty(missingFields)) {
      throw new Error('Installed driver did not expose correct fields for compability ' +
                      `with Appium. Missing fields: ${JSON.stringify(missingFields)}`);
    }

  }

}

import _ from 'lodash';
import type {ExtMetadata, ExtRecord, InstallType} from 'appium/types';
import type {ExtensionConfig} from '../extension/extension-config';
import ExtensionCliCommand from './extension-command';
import type {ExtensionUpdateResult, RunOutput} from './extension-command';
import {KNOWN_DRIVERS} from '../constants';
import '@colors/colors';

const REQ_DRIVER_FIELDS = ['driverName', 'automationName', 'platformNames', 'mainClass'];
type DriverInstallOpts = {driver: string; installType: InstallType; packageName?: string};
type DriverUninstallOpts = {driver: string};
type DriverUpdateOpts = {driver: string; unsafe: boolean};
type DriverRunOptions = {driver: string; scriptName: string; extraArgs?: string[]};
type DriverDoctorOptions = {driver: string};
type DriverExtensionConfig = ExtensionConfig<'driver'>;

export default class DriverCliCommand extends ExtensionCliCommand<'driver'> {
  constructor({config, json}: {config: DriverExtensionConfig; json: boolean}) {
    super({config, json});
    this.knownExtensions = KNOWN_DRIVERS;
  }

  /**
   * Install a driver
   *
   * @param opts - install options
   */
  async install({driver, installType, packageName}: DriverInstallOpts): Promise<ExtRecord<'driver'>> {
    return await super._install({
      installSpec: driver,
      installType,
      packageName,
    });
  }

  /**
   * Uninstall a driver
   *
   * @param opts - uninstall options
   */
  async uninstall({driver}: DriverUninstallOpts): Promise<ExtRecord<'driver'>> {
    return await super._uninstall({installSpec: driver});
  }

  /**
   * Update a driver
   *
   * @param opts - update options
   */
  async update({driver, unsafe}: DriverUpdateOpts): Promise<ExtensionUpdateResult> {
    return await super._update({installSpec: driver, unsafe});
  }

  /**
   * Run a script from a driver
   *
   * @param opts - script execution options
   * @throws {Error} if the script fails to run
   */
  async run({driver, scriptName, extraArgs}: DriverRunOptions): Promise<RunOutput> {
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
   * @param opts - doctor command options
   * @returns The amount of executed doctor checks.
   * @throws {Error} If any of the mandatory Doctor checks fails.
   */
  async doctor({driver}: DriverDoctorOptions): Promise<number> {
    return await super._doctor({
      installSpec: driver,
    });
  }

  /**
   * Builds the success message displayed after a driver installation.
   *
   * @param args - installed extension name and metadata
   * @returns formatted success text
   */
  override getPostInstallText({
    extName,
    extData,
  }: {
    extName: string;
    extData: {version: string; automationName: string; platformNames: unknown};
  }): string {
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
   * @param driverMetadata - `appium` metadata from extension package
   * @param installSpec - install spec from CLI
   */
  override validateExtensionFields(driverMetadata: ExtMetadata<'driver'>, installSpec: string): void {
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

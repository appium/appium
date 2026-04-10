import _ from 'lodash';
import type {DriverClass, DriverType, StringRecord} from '@appium/types';
import type {ExtManifest, ExtName, ExtRecord} from 'appium/types';
import {DRIVER_TYPE} from '../constants';
import log from '../logger';
import type {ExtManifestProblem} from './extension-config';
import {ExtensionConfig} from './extension-config';
import type {Manifest} from './manifest';

export type MatchedDriver = {
  driver: DriverClass;
  version: string;
  driverName: string;
};

export class DriverConfig extends ExtensionConfig<DriverType> {
  private static readonly _instances = new WeakMap<Manifest, DriverConfig>();
  private knownAutomationNames = new Set<string>();

  private constructor(manifest: Manifest) {
    super(DRIVER_TYPE, manifest);
  }

  static create(manifest: Manifest): DriverConfig {
    const instance = new DriverConfig(manifest);
    if (DriverConfig.getInstance(manifest)) {
      throw new Error(
        `Manifest with APPIUM_HOME ${manifest.appiumHome} already has a DriverConfig; use DriverConfig.getInstance() to retrieve it.`
      );
    }
    DriverConfig._instances.set(manifest, instance);
    return instance;
  }

  static getInstance(manifest: Manifest): DriverConfig | undefined {
    return DriverConfig._instances.get(manifest);
  }

  async validate(): Promise<ExtRecord<DriverType>> {
    this.knownAutomationNames.clear();
    return await super._validate(this.manifest.getExtensionData(DRIVER_TYPE) as ExtRecord<DriverType>);
  }

  public override extensionDesc(
    driverName: ExtName<DriverType>,
    {version, automationName}: ExtManifest<DriverType>
  ): string {
    return `${String(driverName)}@${version} (automationName '${automationName}')`;
  }

  async findMatchingDriver<C extends StringRecord>({
    automationName,
    platformName,
  }: C): Promise<MatchedDriver> {
    if (!_.isString(platformName)) {
      throw new Error('You must include a platformName capability');
    }

    if (!_.isString(automationName)) {
      throw new Error('You must include an automationName capability');
    }

    log.info(
      `Attempting to find matching driver for automationName ` +
        `'${automationName}' and platformName '${platformName}'`
    );

    try {
      const {driverName, mainClass, version} = this._getDriverBySupport(automationName, platformName);
      log.info(`The '${driverName}' driver was installed and matched caps.`);
      log.info(`Will require it at ${this.getInstallPath(driverName)}`);
      const driver = await this.requireAsync(driverName as ExtName<DriverType>);
      if (!driver) {
        throw new Error(
          `Driver '${driverName}' did not export a class with name '${mainClass}'. Contact the author of the driver!`
        );
      }
      return {driver, version, driverName};
    } catch (err: any) {
      const msg =
        `Could not find a driver for automationName ` +
        `'${automationName}' and platformName '${platformName}'. ` +
        `Have you installed a driver that supports those ` +
        `capabilities? Run 'appium driver list --installed' to see. ` +
        `(Lower-level error: ${err.message})`;
      throw new Error(msg);
    }
  }

  protected override getConfigProblems(
    extManifest: ExtManifest<DriverType>,
    extName: string
  ): ExtManifestProblem[] {
    void extName;
    const problems: ExtManifestProblem[] = [];
    const {platformNames, automationName} = extManifest;

    if (!_.isArray(platformNames)) {
      problems.push({
        err: 'Missing or incorrect supported platformNames list.',
        val: platformNames,
      });
    } else if (_.isEmpty(platformNames)) {
      problems.push({
        err: 'Empty platformNames list.',
        val: platformNames,
      });
    } else {
      for (const pName of platformNames) {
        if (!_.isString(pName)) {
          problems.push({
            err: 'Incorrectly formatted platformName.',
            val: pName,
          });
        }
      }
    }

    if (!_.isString(automationName)) {
      problems.push({
        err: 'Missing or incorrect automationName',
        val: automationName,
      });
    }

    if (this.knownAutomationNames.has(automationName as string)) {
      problems.push({
        err: 'Multiple drivers claim support for the same automationName',
        val: automationName,
      });
    }

    this.knownAutomationNames.add(automationName as string);

    return problems;
  }

  private _getDriverBySupport(
    matchAutomationName: string,
    matchPlatformName: string
  ): ExtManifest<DriverType> & {driverName: string} {
    const drivers = this.installedExtensions;
    for (const [driverName, driverData] of _.toPairs(drivers)) {
      const {automationName, platformNames} = driverData;
      const aNameMatches = automationName.toLowerCase() === matchAutomationName.toLowerCase();
      const pNameMatches = _.includes(platformNames.map((p) => _.toLower(p)), matchPlatformName.toLowerCase());

      if (aNameMatches && pNameMatches) {
        return {driverName, ...driverData};
      }

      if (aNameMatches) {
        throw new Error(
          `Driver '${driverName}' supports automationName ` +
            `'${automationName}', but Appium could not find ` +
            `support for platformName '${matchPlatformName}'. Supported ` +
            `platformNames are: ` +
            JSON.stringify(platformNames)
        );
      }
    }

    throw new Error(`Could not find installed driver to support given caps`);
  }
}

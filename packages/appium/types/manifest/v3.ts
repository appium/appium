import {DriverType, ExtensionType, PluginType} from '@appium/types';
import {SchemaObject} from 'ajv';
import {PackageJson, SetRequired} from 'type-fest';

/**
 * One of the possible extension installation stratgies
 */
export type InstallType = 'npm' | 'git' | 'local' | 'github';

export interface InternalMetadata {
  /**
   * Package name of extension
   *
   * `name` from its `package.json`
   */
  pkgName: string;
  /**
   * Version of extension
   *
   * `version` from its `package.json`
   */
  version: string;
  /**
   * The method in which the user installed the extension (the `source` CLI arg)
   */
  installType: InstallType;
  /**
   * Whatever the user typed as the extension to install. May be derived from `package.json`
   */
  installSpec: string;
  /**
   * Maximum version of Appium that this extension is compatible with.
   *
   * If `undefined`, we'll try anyway.
   */
  appiumVersion?: string;
  /**
   * Path to the extension's root directory
   */
  installPath: string;
}

/**
 * Shape of the `appium.schema` property in an extension's `package.json` (if it exists)
 */
export type ExtSchemaMetadata = string | (SchemaObject & {[key: number]: never});

/**
 * Manifest data shared by all extensions, as contained in `package.json`
 */
export interface CommonExtMetadata {
  /**
   * The main class of the extension.
   *
   * The extension must export this class by name.
   */
  mainClass: string;

  /**
   * Lookup table of scripts to run via `appium <driver|plugin> run <script>` keyed by name.
   */
  scripts?: Record<string, string>;

  /**
   * Schema describing configuration options (and CLI args) for the extension.
   *
   * Can also just be a path (relative to the extension root) to an external JSON schema file.
   */
  schema?: ExtSchemaMetadata;
}

/**
 * Driver-specific manifest data as stored in a driver's `package.json`
 */
export interface DriverMetadata {
  /**
   * Automation name of the driver
   */
  automationName: string;
  /**
   * Platforms the driver supports
   */
  platformNames: string[];
  /**
   * Short name of the driver (displayed in `appium list`, etc.)
   */
  driverName: string;
}

/**
 * Plugin-specific manifest data as stored in a plugin's `package.json`
 */
export interface PluginMetadata {
  /**
   * Short name of the plugin (displayed in `appium list`, etc.)
   */
  pluginName: string;
}

/**
 * Generic extension metadata as stored in the `appium` prop of an extension's `package.json`.
 */
export type ExtMetadata<ExtType extends ExtensionType> = (ExtType extends DriverType
  ? DriverMetadata
  : ExtType extends PluginType
  ? PluginMetadata
  : never) &
  CommonExtMetadata;

/**
 * Combination of external + internal extension data with `driverName`/`pluginName` removed (it becomes a key in an {@linkcode ExtRecord} object).
 * Part of `extensions.yaml`.
 */
export type ExtManifest<ExtType extends ExtensionType> = Omit<
  ExtMetadata<ExtType>,
  'driverName' | 'pluginName'
> &
  InternalMetadata;

/**
 * Lookup of extension name to {@linkcode ExtManifest}.
 * @see {ManifestData}
 */
export type ExtRecord<ExtType extends ExtensionType> = Record<string, ExtManifest<ExtType>>;

/**
 * The shape of the `extensions.yaml` file
 */
export interface ManifestData {
  drivers: ExtRecord<DriverType>;
  plugins: ExtRecord<PluginType>;
  schemaRev: number;
}

/**
 * The name of an installed extension, as it appears in `extensions.yaml`
 * (as a property name under `drivers` or `plugins`)
 */
export type ExtName<ExtType extends ExtensionType> = keyof ExtRecord<ExtType>;

/**
 * A `package.json` containing extension metadata.
 * Must have the following properties:
 * - `name`: the name of the extension
 * - `version`: the version of the extension
 * - `appium`: the metadata for the extension
 * - `peerDependencies.appium`: the maximum compatible version of Appium
 */
export type ExtPackageJson<ExtType extends ExtensionType> = SetRequired<
  PackageJson,
  'name' | 'version'
> & {
  appium: ExtMetadata<ExtType>;
  peerDependencies: {appium: string; [key: string]: string};
};

/**
 * A transient format between installation and insertion of extension metadata into the manifest.
 */
export type ExtInstallReceipt<ExtType extends ExtensionType> = ExtMetadata<ExtType> &
  InternalMetadata;

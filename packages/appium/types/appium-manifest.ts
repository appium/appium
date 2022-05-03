import { CommonMetadata, ExtMetadata, SchemaMetadata } from './external-manifest';
import { ExtensionType, DriverType, PluginType } from '.';

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
}

/**
 * Combination of external + internal extension data with `driverName`/`pluginName` removed (it becomes a key in an {@linkcode ExtRecord} object).
 * Part of `extensions.yaml`.
 */
export type ExtManifest<ExtType extends ExtensionType> = Omit<
  ExtMetadata<ExtType>,
  ExtType extends DriverType
    ? 'driverName'
    : ExtType extends PluginType
    ? 'pluginName'
    : never
> &
  InternalMetadata &
  CommonMetadata; // XXX: ExtMetadata should be a union with CommonMetadata. why is this needed?

export type WithSchemaManifest = {
  schema: SchemaMetadata;
};

/**
 * This is just a {@linkcode ExtManifest} except it _for sure_ has a `schema` prop.
 */
export type ExtManifestWithSchema<ExtType extends ExtensionType> =
  ExtManifest<ExtType> & WithSchemaManifest;

/**
 * Generic type for an object keyed by extension name, with values of type {@linkcode ExtData}
 */
export type ExtRecord<ExtType extends ExtensionType> = Record<
  string,
  ExtManifest<ExtType>
>;

export type DriverRecord = ExtRecord<DriverType>;
export type PluginRecord = ExtRecord<PluginType>;

export type ExtName<ExtType extends ExtensionType> = keyof ExtRecord<ExtType>;

/**
 * Represents an entire YAML manifest (`extensions.yaml`)
 */
export interface ManifestData {
  drivers: DriverRecord;
  plugins: PluginRecord;
  schemaRev?: number;
}

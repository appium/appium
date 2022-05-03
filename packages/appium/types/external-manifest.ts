/**
 * These types describe information about external extensions and the contents of their `package.json` files
 */

import type {SchemaObject} from 'ajv';
import type {PackageJson, SetRequired} from 'type-fest';
import {DriverType, ExtensionType, PluginType} from '@appium/types';

/**
 * This is what is allowed in the `appium.schema` prop of an extension's `package.json`.
 */
export type SchemaMetadata = string | (SchemaObject & {[key: number]: never});

/**
 * Manifest data shared by all extensions, as contained in `package.json`
 */
export interface CommonMetadata {
  mainClass: string;
  scripts?: Record<string, string>;
  schema?: SchemaMetadata;
}

/**
 * Driver-specific manifest data as contained in `package.json`
 */
export interface DriverMetadata {
  automationName: string;
  platformNames: string[];
  driverName: string;
}

/**
 * Plugin-specific manifest data as stored in `package.json`
 */
export interface PluginMetadata {
  pluginName: string;
}

/**
 * Generic type to refer to either {@linkcode DriverMetadata} or {@linkcode PluginMetadata}
 * Corresponds to the `appium` prop in an extension's `package.json`.
 */
export type ExtMetadata<ExtType extends ExtensionType> = (ExtType extends DriverType
  ? DriverMetadata
  : ExtType extends PluginType
  ? PluginMetadata
  : never) &
  CommonMetadata;

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

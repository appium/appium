import type {ExtensionType} from '@appium/types';
import type {ExtManifest} from 'appium/types/index.js';

/**
 * Extra stuff about extensions; returned by the `list` CLI command.
 */
export type ExtensionListMetadata = {
  installed: boolean;
  upToDate?: boolean;
  updateVersion?: string | null;
  unsafeUpdateVersion?: string | null;
  updateError?: string;
  devMode?: boolean;
  repositoryUrl?: string;
};
/**
 * Possible return value of the `list` CLI command
 */
export type ExtensionListData<ExtType extends ExtensionType = ExtensionType> = Partial<ExtManifest<ExtType>> &
  Partial<ExtensionListMetadata>;

export type InstalledExtensionListData<ExtType extends ExtensionType = ExtensionType> = ExtManifest<ExtType> &
  ExtensionListMetadata;

/**
 * Return value of the `list` CLI command.
 */
export type ExtensionList<ExtType extends ExtensionType = ExtensionType> = Record<string, ExtensionListData<ExtType>>;

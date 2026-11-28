import type {ExtensionType} from '@appium/types';
import type {ExtRecord, ManifestDataVersions} from 'appium/types/index.js';

import {CURRENT_SCHEMA_REV, DRIVER_TYPE, PLUGIN_TYPE} from '../../constants.js';
import {log} from '../../logger.js';

const SCHEMA_REV_3 = 3;
const SCHEMA_REV_4 = 4;

/** The part of `Manifest` that migrations use; keeps this module independent of the class. */
export interface MigratableManifest {
  readonly schemaRev: number;
  getExtensionData<ExtType extends ExtensionType>(extType: ExtType): ExtRecord<ExtType>;
  setSchemaRev(rev: number): void;
}

type Migration = (manifest: MigratableManifest) => boolean | Promise<boolean>;

const Migrations: Partial<Record<keyof ManifestDataVersions, Migration>> = {
  [SCHEMA_REV_3]: (manifest) => {
    const drivers = manifest.getExtensionData(DRIVER_TYPE);
    const plugins = manifest.getExtensionData(PLUGIN_TYPE);
    const allExtData = [...Object.values(drivers), ...Object.values(plugins)];
    return allExtData.some((metadata) => !('installPath' in metadata));
  },
  [SCHEMA_REV_4]: (manifest) => {
    if (manifest.schemaRev < SCHEMA_REV_4) {
      const drivers = manifest.getExtensionData(DRIVER_TYPE);
      const plugins = manifest.getExtensionData(PLUGIN_TYPE);
      const allExtData = [...Object.values(drivers), ...Object.values(plugins)];
      return allExtData.some((metadata) => metadata.installType === 'npm');
    }
    return false;
  },
};

/**
 * Applies a series of migration functions to a manifest to update its manifest schema version.
 *
 * `data` is modified in-place.
 *
 * @returns If `true` existing packages should be synced from disk and the manifest should be persisted.
 */
export async function migrate(manifest: MigratableManifest): Promise<boolean> {
  let didChange = false;
  for (const migration of Object.values(Migrations)) {
    if (migration) {
      didChange = (await migration(manifest)) || didChange;
    }
  }
  didChange = setSchemaRev(manifest, CURRENT_SCHEMA_REV) || didChange;
  if (didChange) {
    log.debug(`Upgraded extension manifest to schema v${manifest.schemaRev}`);
  }

  return didChange;
}

function setSchemaRev(manifest: MigratableManifest, version: number): boolean {
  if ((manifest.schemaRev ?? 0) < version) {
    manifest.setSchemaRev(version);
    return true;
  }
  return false;
}

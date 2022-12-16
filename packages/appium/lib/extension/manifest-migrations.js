import {DRIVER_TYPE, PLUGIN_TYPE} from '../constants';
import log from '../logger';

/**
 * This contains logic to migrate old versions of `extensions.yaml` to new versions.
 *
 * @module
 */

/**
 * Constant for v3 of the schema rev.
 */
const SCHEMA_REV_3 = 3;

/**
 * Collection of functions to migrate from one version to another.
 *
 * These functions _should not actually perform the migration_; rather, they
 * should return `true` if the migration should be performed.  The migration
 * itself will happen within {@linkcode Manifest.syncWithInstalledExtensions}; the extensions
 * will be checked and the manifest file updated per the state of the filesystem.
 *
 * @type {{[P in keyof ManifestDataVersions]?: Migration}}
 */
const Migrations = {
  /**
   * If `installPath` is missing from the `ExtManifest` for any extension, return `true`.
   *
   * We cannot easily determine the path of any given extension here, but returning `true`
   * will cause the `Manifest` to sync with the filesystem, which will populate the missing field.
   *
   * @type {Migration}
   */
  [SCHEMA_REV_3]: (manifest) => {
    let shouldSync = false;
    /** @type {Array<ExtManifest<PluginType>|ExtManifest<DriverType>>} */
    const allExtData = [
      ...Object.values(manifest.getExtensionData(DRIVER_TYPE)),
      ...Object.values(manifest.getExtensionData(PLUGIN_TYPE)),
    ];
    for (const metadata of allExtData) {
      if (!('installPath' in metadata)) {
        shouldSync = true;
        break;
      }
    }
    return shouldSync;
  },
};

/**
 * Set `schemaRev` to a specific version.
 *
 * This _does_ mutate `data` in-place, unlike functions in
 * {@linkcode Migrations}.
 *
 * Again, returning `true` means that the manifest should be--at
 * minimum--persisted to disk, since we changed it.
 * @param {Readonly<Manifest>} manifest
 * @param {keyof ManifestDataVersions} version
 * @returns {boolean} Whether the data was modified
 */
function setSchemaRev(manifest, version) {
  if (manifest.schemaRev ?? 0 < version) {
    manifest.setSchemaRev(version);
    return true;
  }
  return false;
}

/**
 * Applies a series of migration functions to a manifest to update its manifest schema version.
 *
 * `data` is modified in-place.
 *
 * @param {Readonly<Manifest>} manifest
 * @returns {Promise<boolean>} If `true` existing packages should be synced from disk and the manifest should be persisted.
 */
export async function migrate(manifest) {
  let didChange = false;
  for await (const [v, migration] of Object.entries(Migrations)) {
    const version = /** @type {keyof ManifestDataVersions} */ (Number(v));
    didChange = (await migration(manifest)) || didChange;
    didChange = setSchemaRev(manifest, version) || didChange;
  }

  if (didChange) {
    // this is not _technically_ true, since we don't actually write the file here.
    log.info(`Upgraded extension manifest to schema v${manifest.schemaRev}`);
  }

  return didChange;
}

/**
 * A migration function. It will return `true` if a change _should be made_.
 *
 * A migration function should not modify `schemaRev`, as this is done automatically.
 *
 * Note that at the time of writing, we're not able to determine the version of the _current_ manifest file if there is no `schemaRev` prop present (and we may not want to trust it anyway).
 * @callback Migration
 * @param {Readonly<Manifest>} manifest - The `Manifest` instance
 * @returns {boolean|Promise<boolean>} If `true`, then something changed
 */

/**
 * @typedef {import('appium/types').ManifestData} ManifestData
 * @typedef {import('@appium/types').DriverType} DriverType
 * @typedef {import('@appium/types').PluginType} PluginType
 * @typedef {import('appium/types').AnyManifestDataVersion} AnyManifestDataVersion
 * @typedef {import('appium/types').ManifestDataVersions} ManifestDataVersions
 * @typedef {import('@appium/types').ExtensionType} ExtensionType
 * @typedef {import('appium/types').ManifestV2.ManifestData} ManifestDataV2
 * @typedef {import('./manifest').Manifest} Manifest
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {import('appium/types').ExtManifest<ExtType>} ExtManifest
 */

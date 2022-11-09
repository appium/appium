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
 * Collection of functions to migrate from one version to another
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
  [SCHEMA_REV_3]: (data) => {
    let shouldSync = false;
    const allExtData = [...Object.values(data.drivers), ...Object.values(data.plugins)];
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
 * Set `schemaRev` to a specific version
 * @param {AnyManifestDataVersion} data
 * @param {keyof ManifestDataVersions} version
 * @returns {boolean} Whether the data was modified
 */
function setSchemaRev(data, version) {
  if (data.schemaRev ?? 0 < version) {
    data.schemaRev = version;
    return true;
  }
  return false;
}

/**
 * Applies a series of migration functions to a manifest to update its manifest schema version.
 *
 * `data` is modified in-place.
 *
 * @param {Manifest} manifest
 * @param {AnyManifestDataVersion} data
 * @returns {Promise<boolean>} If `true` existing packages should be synced from disk and the manifest should be persisted.
 */
export async function migrate(manifest, data) {
  let didChange = false;
  for await (const [v, migration] of Object.entries(Migrations)) {
    const version = /** @type {keyof ManifestDataVersions} */ (Number(v));
    didChange = (await migration(data, manifest)) || didChange;
    didChange = setSchemaRev(data, version) || didChange;
  }

  if (didChange) {
    // this is not _technically_ true, since we don't actually write the file here.
    log.info(`Upgraded extension manifest to schema v${data.schemaRev}`);
  }
  return didChange;
}

/**
 * Migration functions take a {@linkcode Manifest} and its data and **mutates `data` in-place**.
 *
 * A migration function should not modify `schemaRev`, as this is done automatically.
 *
 * A migration function can also call out to, say, {@linkcode Manifest.syncWithInstalledExtensions}, which
 * may apply the mutation itself.
 *
 * Note that at the time of writing, we're not able to determine the version of the _current_ manifest file if there is no `schemaRev` prop present (and we may not want to trust it anyway).
 * @callback Migration
 * @param {AnyManifestDataVersion} data - The raw data from `Manifest`
 * @param {Manifest} manifest - The `Manifest` instance
 * @returns {boolean|Promise<boolean>} If `true`, then something changed
 */

/**
 * @typedef {import('appium/types').ManifestData} ManifestData
 * @typedef {import('appium/types').AnyManifestDataVersion} AnyManifestDataVersion
 * @typedef {import('appium/types').ManifestDataVersions} ManifestDataVersions
 * @typedef {import('appium/types').ManifestV2.ManifestData} ManifestDataV2
 * @typedef {import('./manifest').Manifest} Manifest
 */

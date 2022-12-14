import path from 'path';

/**
 * The name of the extension type for drivers
 */
export const DRIVER_TYPE = 'driver';

/**
 * The name of the extension type for plugins
 */
export const PLUGIN_TYPE = 'plugin';

/**
 * The `server` command of the `appium` CLI
 */
export const SERVER_SUBCOMMAND = 'server';

/**
 * The value of `--use-plugins` if _all_ plugins should be loaded
 */
export const USE_ALL_PLUGINS = 'all';

// This is a map of plugin names to npm packages representing those plugins.
// The plugins in this list will be available to the CLI so users can just
// type 'appium plugin install 'name'', rather than having to specify the full
// npm package. I.e., these are the officially recognized plugins.
export const KNOWN_PLUGINS = Object.freeze(
  /** @type {const} */ ({
    images: '@appium/images-plugin',
    'execute-driver': '@appium/execute-driver-plugin',
    'relaxed-caps': '@appium/relaxed-caps-plugin',
    'universal-xml': '@appium/universal-xml-plugin',
  })
);

// This is a map of driver names to npm packages representing those drivers.
// The drivers in this list will be available to the CLI so users can just
// type 'appium driver install 'name'', rather than having to specify the full
// npm package. I.e., these are the officially recognized drivers.
export const KNOWN_DRIVERS = Object.freeze(
  /** @type {const} */ ({
    uiautomator2: 'appium-uiautomator2-driver',
    xcuitest: 'appium-xcuitest-driver',
    mac2: 'appium-mac2-driver',
    espresso: 'appium-espresso-driver',
    safari: 'appium-safari-driver',
    gecko: 'appium-geckodriver',
    chromium: 'appium-chromium-driver',
  })
);

/**
 * Relative path to directory containing any Appium internal files
 */
export const CACHE_DIR_RELATIVE_PATH = path.join('node_modules', '.cache', 'appium');

/**
 * Relative path to hashfile (from `APPIUM_HOME`) of consuming project's `package.json` (if it exists)
 */
export const PKG_HASHFILE_RELATIVE_PATH = path.join(CACHE_DIR_RELATIVE_PATH, 'package.hash');

export const EXT_SUBCOMMAND_LIST = 'list';
export const EXT_SUBCOMMAND_INSTALL = 'install';
export const EXT_SUBCOMMAND_UNINSTALL = 'uninstall';
export const EXT_SUBCOMMAND_UPDATE = 'update';
export const EXT_SUBCOMMAND_RUN = 'run';

/**
 * Current revision of the manifest (`extensions.yaml`) schema
 */
export const CURRENT_SCHEMA_REV = 3;

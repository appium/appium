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
 * The `setup` command of the `appium` CLI
 */
export const SETUP_SUBCOMMAND = 'setup';


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
    storage: '@appium/storage-plugin',
    'universal-xml': '@appium/universal-xml-plugin',
  }),
);

export const MOBILE_DRIVERS = Object.freeze(
  /** @type {const} */ ({
    uiautomator2: 'appium-uiautomator2-driver',
    xcuitest: 'appium-xcuitest-driver',
    espresso: 'appium-espresso-driver',
  }),
);

export const DESKTOP_DRIVERS = Object.freeze(
  /** @type {const} */ ({
    mac2: 'appium-mac2-driver',
    windows: 'appium-windows-driver',
  }),
);

export const DESKTOP_BROWSERS = Object.freeze(
  /** @type {const} */ ({
    safari: 'appium-safari-driver',
    gecko: 'appium-geckodriver',
    chromium: 'appium-chromium-driver',
  }),
);

// This is a map of driver names to npm packages representing those drivers.
// The drivers in this list will be available to the CLI so users can just
// type 'appium driver install 'name'', rather than having to specify the full
// npm package. I.e., these are the officially recognized drivers.
export const KNOWN_DRIVERS = Object.freeze(
  /** @type {const} */ ({
    ...MOBILE_DRIVERS,
    ...DESKTOP_DRIVERS,
    ...DESKTOP_BROWSERS,
  }),
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
export const EXT_SUBCOMMAND_DOCTOR = 'doctor';

/**
 * Current revision of the manifest (`extensions.yaml`) schema
 */
export const CURRENT_SCHEMA_REV = 4;

/**
 * The default number of stack frames to show in a "long" stack trace, when enabled via `--long-stacktrace`
 * @remarks This value may be increased in the future.
 * @privateRemarks A value like `Infinity` may provide to have deleterious effects on
 * memory usage, perf, and/or log output, and higher limits may be difficult to scan.
 */
export const LONG_STACKTRACE_LIMIT = 100;

/**
 * Where should the bidi websocket handler live on the server?
 */
export const BIDI_BASE_PATH = '/bidi';

/**
 * The name of the event for drivers to emit when they want to send bidi events to a client over
 * a bidi socket
 */
export const BIDI_EVENT_NAME = 'bidiEvent';

/**
 * The name of the insecure feature that allows retrieving the list of active server sessions
 */
export const SESSION_DISCOVERY_FEATURE = 'session_discovery';

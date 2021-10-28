// @ts-check

// @ts-ignore
import { DEFAULT_BASE_PATH } from '@appium/base-driver';
import _ from 'lodash';
import DriverConfig from '../driver-config';
import { APPIUM_HOME, DRIVER_TYPE, INSTALL_TYPES, PLUGIN_TYPE } from '../extension-config';
import PluginConfig from '../plugin-config';
import { toParserArgs } from '../schema/cli-args';

const DRIVER_EXAMPLE = 'xcuitest';
const PLUGIN_EXAMPLE = 'find_by_image';
const USE_ALL_PLUGINS = 'all';

/** @type {Set<ExtensionType>} */
const EXTENSION_TYPES = new Set([DRIVER_TYPE, PLUGIN_TYPE]);

const driverConfig = DriverConfig.getInstance(APPIUM_HOME);
const pluginConfig = PluginConfig.getInstance(APPIUM_HOME);

// this set of args works for both drivers and plugins ('extensions')
/** @type {ArgumentDefinitions} */
const globalExtensionArgs = new Map([
  [['--json'], {
    required: false,
    default: false,
    action: 'store_true',
    help: 'Use JSON for output format',
    dest: 'json'
  }]
]);

/**
 * Builds a Record of extension types to a Record of subcommands to their argument definitions
 */
const getExtensionArgs = _.once(function getExtensionArgs () {
  const extensionArgs = {};
  for (const type of EXTENSION_TYPES) {
    extensionArgs[type] = {
      list: makeListArgs(type),
      install: makeInstallArgs(type),
      uninstall: makeUninstallArgs(type),
      update: makeUpdateArgs(type),
      run: makeRunArgs(type),
    };
  }
  return /** @type {Record<ExtensionType, Record<string,ArgumentDefinitions[]>>} */ (extensionArgs);
});

/**
 * Makes the opts for the `list` subcommand for each extension type.
 * @param {ExtensionType} type
 * @returns {ArgumentDefinitions}
 */
function makeListArgs (type) {
  return new Map([
    ...globalExtensionArgs,
    [['--installed'], {
      required: false,
      default: false,
      action: 'store_true',
      help: `List only installed ${type}s`,
      dest: 'showInstalled'
    }],
    [['--updates'], {
      required: false,
      default: false,
      action: 'store_true',
      help: 'Show information about newer versions',
      dest: 'showUpdates'
    }]
  ]);
}

/**
 * Makes the opts for the `install` subcommand for each extension type
 * @param {ExtensionType} type
 * @returns {ArgumentDefinitions}
 */
function makeInstallArgs (type) {
  return new Map([
    ...globalExtensionArgs,
    [[type], {
      type: 'str',
      help: `Name of the ${type} to install, for example: ` +
            type === DRIVER_TYPE ? DRIVER_EXAMPLE : PLUGIN_EXAMPLE,
    }],
    [['--source'], {
      required: false,
      default: null,
      choices: INSTALL_TYPES,
      help: `Where to look for the ${type} if it is not one of Appium's verified ` +
            `${type}s. Possible values: ${INSTALL_TYPES.join(', ')}`,
      dest: 'installType'
    }],
    [['--package'], {
      required: false,
      default: null,
      type: 'str',
      help: `If installing from Git or GitHub, the package name, as defined in the plugin's ` +
            `package.json file in the "name" field, cannot be determined automatically, and ` +
            `should be reported here, otherwise the install will probably fail.`,
      dest: 'packageName',
    }],
  ]);
}


/**
 * Makes the opts for the `uninstall` subcommand for each extension type
 * @param {ExtensionType} type
 * @returns {ArgumentDefinitions}
 */
function makeUninstallArgs (type) {
  return new Map([
    ...globalExtensionArgs,
    [[type], {
      type: 'str',
      help: 'Name of the driver to uninstall, for example: ' +
            type === DRIVER_TYPE ? DRIVER_EXAMPLE : PLUGIN_EXAMPLE
    }],
  ]);
}

/**
 * Makes the opts for the `update` subcommand for each extension type
 * @param {ExtensionType} type
 * @returns {ArgumentDefinitions}
 */
function makeUpdateArgs (type) {
  return new Map([
    ...globalExtensionArgs,
    [[type], {
      type: 'str',
      help: `Name of the ${type} to update, or the word "installed" to update all installed ` +
            `${type}s. To see available updates, run "appium ${type} list --installed --updates". ` +
            'For example: ' + type === DRIVER_TYPE ? DRIVER_EXAMPLE : PLUGIN_EXAMPLE,
    }],
    [['--unsafe'], {
      required: false,
      default: false,
      action: 'store_true',
      help: `Include updates that might have a new major revision, and potentially include ` +
            `breaking changes`,
    }],
  ]);
}

/**
 * Makes the opts for the `run` subcommand for each extension type
 * @param {ExtensionType} type
 * @returns {ArgumentDefinitions}
 */
function makeRunArgs (type) {
  return new Map([
    ...globalExtensionArgs,
    [[type], {
      type: 'str',
      help: `Name of the ${type} to run a script from, for example: ` +
            type === DRIVER_TYPE ? DRIVER_EXAMPLE : PLUGIN_EXAMPLE,
    }],
    [['scriptName'], {
      default: null,
      type: 'str',
      help: `Name of the script to run from the ${type}. The script name must be cached ` +
            `inside the "scripts" field under "appium" inside the ${type}'s "package.json" file`
    }],
  ]);
}

/**
 * Derives the options for the `server` command from the schema, and adds the arguments
 * which are disallowed in the config file.
 * @returns {ArgumentDefinitions}
 */
function getServerArgs () {
  return new Map([
    ...toParserArgs({
      overrides: {
        basePath: {
          default: DEFAULT_BASE_PATH
        },
      }
    }),
    ...serverArgsDisallowedInConfig,
  ]);
}

/**
 * These don't make sense in the context of a config file for obvious reasons.
 * @type {ArgumentDefinitions}
 */
const serverArgsDisallowedInConfig = new Map([
  [
    ['--shell'],
    {
      required: false,
      default: null,
      help: 'Enter REPL mode',
      action: 'store_true',
      dest: 'shell',
    },
  ],
  [
    ['--show-config'],
    {
      default: false,
      dest: 'showConfig',
      action: 'store_true',
      required: false,
      help: 'Show info about the appium server configuration and exit',
    },
  ],
  [
    ['--config'],
    {
      dest: 'configFile',
      type: 'string',
      required: false,
      help: 'Explicit path to Appium configuration file',
    },
  ],
]);

export {
  getServerArgs,
  getExtensionArgs,
  USE_ALL_PLUGINS,
  driverConfig,
  pluginConfig,
  APPIUM_HOME
};

/**
 * Alias
 * @typedef {import('../ext-config-io').ExtensionType} ExtensionType
 */

/**
 * A tuple of argument aliases and argument options
 * @typedef {Map<string[],import('argparse').ArgumentOptions>} ArgumentDefinitions
 */

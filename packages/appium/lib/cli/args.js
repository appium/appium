import { DEFAULT_BASE_PATH } from '@appium/base-driver';
import _ from 'lodash';
import DriverConfig from '../driver-config';
import { APPIUM_HOME, DRIVER_TYPE, INSTALL_TYPES, PLUGIN_TYPE } from '../extension-config';
import PluginConfig from '../plugin-config';
import {
  parseDriverNames, parseInstallTypes, parseJsonStringOrFile,
  parsePluginNames, parseSecurityFeatures
} from './parser-helpers';
import { toParserArgs } from './schema-args';

const DRIVER_EXAMPLE = 'xcuitest';
const PLUGIN_EXAMPLE = 'find_by_image';
const USE_ALL_PLUGINS = 'all';

const driverConfig = new DriverConfig(APPIUM_HOME);
const pluginConfig = new PluginConfig(APPIUM_HOME);

// this set of args works for both drivers and plugins ('extensions')
const globalExtensionArgs = [
  [['--json'], {
    required: false,
    default: false,
    action: 'store_true',
    help: 'Use JSON for output format',
    dest: 'json'
  }]
];

const getExtensionArgs = _.once(function getExtensionArgs () {
  const extensionArgs = {};
  for (const type of [DRIVER_TYPE, PLUGIN_TYPE]) {
    extensionArgs[type] = {
      list: makeListArgs(type),
      install: makeInstallArgs(type),
      uninstall: makeUninstallArgs(type),
      update: makeUpdateArgs(type),
      run: makeRunArgs(type),
    };
  }
  return extensionArgs;
});

/**
 *
 * @param {ExtensionType} type
 * @returns
 */
function makeListArgs (type) {
  return [
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
  ];
}


function makeInstallArgs (type) {
  return [
    ...globalExtensionArgs,
    [[type], {
      type: 'str',
      help: `Name of the ${type} to install, for example: ` +
            type === DRIVER_TYPE ? DRIVER_EXAMPLE : PLUGIN_EXAMPLE,
    }],
    [['--source'], {
      required: false,
      default: null,
      type: parseInstallTypes,
      help: `Where to look for the ${type} if it is not one of Appium's verified ` +
            `${type}s. Possible values: ${JSON.stringify(INSTALL_TYPES)}`,
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
  ];
}

function makeUninstallArgs (type) {
  return [
    ...globalExtensionArgs,
    [[type], {
      type: 'str',
      help: 'Name of the driver to uninstall, for example: ' +
            type === DRIVER_TYPE ? DRIVER_EXAMPLE : PLUGIN_EXAMPLE
    }],
  ];
}

function makeUpdateArgs (type) {
  return [
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
  ];
}

function makeRunArgs (type) {
  return [
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
  ];
}

function getServerArgs () {
  return [
    ...toParserArgs({
      overrides: {
        allowInsecure: {
          type: parseSecurityFeatures
        },
        basePath: {
          default: DEFAULT_BASE_PATH
        },
        defaultCapabilities: {
          type: parseJsonStringOrFile
        },
        denyInsecure: {
          type: parseSecurityFeatures
        },
        drivers: {
          type: parseDriverNames
        },
        nodeconfig: {
          type: parseJsonStringOrFile
        },
        plugins: {
          type: parsePluginNames
        }
      }
    }),
    ...serverArgsDisallowedInConfig,
  ];
}

/**
 * These don't make sense in the context of a config file for obvious reasons.
 */
const serverArgsDisallowedInConfig = [
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
];

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
 * @typedef {[string[], import('argparse').ArgumentOptions]} ArgumentDefinition
 */

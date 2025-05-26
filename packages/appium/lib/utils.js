import _ from 'lodash';
import logger from './logger';
import {
  processCapabilities,
  PROTOCOLS,
  STANDARD_CAPS,
  errors,
} from '@appium/base-driver';
import {inspect as dump} from 'util';
import {node, fs} from '@appium/support';
import path from 'path';
import {SERVER_SUBCOMMAND, DRIVER_TYPE, PLUGIN_TYPE, SETUP_SUBCOMMAND} from './constants';
import os from 'node:os';

const W3C_APPIUM_PREFIX = 'appium';
const STANDARD_CAPS_LOWERCASE = new Set([...STANDARD_CAPS].map((cap) => cap.toLowerCase()));
export const V4_BROADCAST_IP = '0.0.0.0';
export const V6_BROADCAST_IP = '::';
export const npmPackage = fs.readPackageJsonFrom(__dirname);

/**
 *
 * If `stdout` is a TTY, this is `true`.
 *
 * Used for tighter control over log output.
 * @type {boolean}
 */
const isStdoutTTY = process.stdout.isTTY;

/**
 * Creates an error object in case a session gets incompatible capabilities as the input.
 *
 * @returns {Error}
 */
export function makeNonW3cCapsError() {
  return new errors.SessionNotCreatedError(
    'Session capabilities format must comply to the W3C standard. Make sure your client is up to date. ' +
    'See https://www.w3.org/TR/webdriver/#new-session for more details.'
  );
}

/**
 * Dumps to value to the console using `info` logger.
 *
 * @todo May want to force color to be `false` if {@link isStdoutTTY} is `false`.
 */
export const inspect = _.flow(
  _.partialRight(
    /** @type {(object: any, options: import('util').InspectOptions) => string} */ (dump),
    {colors: true, depth: null, compact: !isStdoutTTY}
  ),
  (...args) => {
    logger.info(...args);
  }
);

/**
 * Takes the caps that were provided in the request and translates them
 * into caps that can be used by the inner drivers.
 *
 * @template {Constraints} C
 * @template [J=any]
 * @param {J} jsonwpCapabilities
 * @param {W3CCapabilities<C>} w3cCapabilities
 * @param {C} constraints
 * @param {NSCapabilities<C>} [defaultCapabilities]
 * @returns {ParsedDriverCaps<C,J>|InvalidCaps<C,J>}
 */
export function parseCapsForInnerDriver(
  jsonwpCapabilities,
  w3cCapabilities,
  constraints = /** @type {C} */ ({}),
  defaultCapabilities = {}
) {
  // Check if the caller sent JSONWP caps, W3C caps, or both
  const hasW3CCaps =
    _.isPlainObject(w3cCapabilities) &&
    (_.has(w3cCapabilities, 'alwaysMatch') || _.has(w3cCapabilities, 'firstMatch'));
  const hasJSONWPCaps = _.isPlainObject(jsonwpCapabilities);
  let desiredCaps = /** @type {ParsedDriverCaps<C>['desiredCaps']} */ ({});
  /** @type {ParsedDriverCaps<C>['processedW3CCapabilities']} */
  let processedW3CCapabilities;
  /** @type {ParsedDriverCaps<C>['processedJsonwpCapabilities']} */
  let processedJsonwpCapabilities;

  if (!hasW3CCaps) {
    return /** @type {InvalidCaps<C>} */ ({
      protocol: PROTOCOLS.W3C,
      error: makeNonW3cCapsError(),
    });
  }

  const {W3C} = PROTOCOLS;
  const protocol = W3C;

  // Make sure we don't mutate the original arguments
  jsonwpCapabilities = _.cloneDeep(jsonwpCapabilities);
  w3cCapabilities = _.cloneDeep(w3cCapabilities);
  defaultCapabilities = _.cloneDeep(defaultCapabilities);

  if (!_.isEmpty(defaultCapabilities)) {
    if (hasW3CCaps) {
      for (const [defaultCapKey, defaultCapValue] of _.toPairs(defaultCapabilities)) {
        let isCapAlreadySet = false;
        // Check if the key is already present in firstMatch entries
        for (const firstMatchEntry of w3cCapabilities.firstMatch ?? []) {
          if (
            _.isPlainObject(firstMatchEntry) &&
            _.has(removeAppiumPrefixes(firstMatchEntry), removeAppiumPrefix(defaultCapKey))
          ) {
            isCapAlreadySet = true;
            break;
          }
        }
        // Check if the key is already present in alwaysMatch entries
        isCapAlreadySet =
          isCapAlreadySet ||
          (_.isPlainObject(w3cCapabilities.alwaysMatch) &&
            _.has(
              removeAppiumPrefixes(w3cCapabilities.alwaysMatch),
              removeAppiumPrefix(defaultCapKey)
            ));
        if (isCapAlreadySet) {
          // Skip if the key is already present in the provided caps
          continue;
        }

        // Only add the default capability if it is not overridden
        if (_.isEmpty(w3cCapabilities.firstMatch)) {
          w3cCapabilities.firstMatch = /** @type {W3CCapabilities<C>['firstMatch']} */ ([
            {[defaultCapKey]: defaultCapValue},
          ]);
        } else {
          w3cCapabilities.firstMatch[0][defaultCapKey] = defaultCapValue;
        }
      }
    }
    if (hasJSONWPCaps) {
      jsonwpCapabilities = {
        ...removeAppiumPrefixes(defaultCapabilities),
        ...jsonwpCapabilities,
      };
    }
  }

  // Get MJSONWP caps
  if (hasJSONWPCaps) {
    processedJsonwpCapabilities = {...jsonwpCapabilities};
  }

  // Get W3C caps
  if (hasW3CCaps) {
    // Call the process capabilities algorithm to find matching caps on the W3C
    // (see: https://github.com/jlipps/simple-wd-spec#processing-capabilities)
    try {
      desiredCaps = processCapabilities(w3cCapabilities, constraints, true);
    } catch (error) {
      logger.info(`Could not parse W3C capabilities: ${error.message}`);
      return /** @type {InvalidCaps<C,J>} */ ({
        desiredCaps,
        processedJsonwpCapabilities,
        processedW3CCapabilities,
        protocol,
        error,
      });
    }

    // Create a new w3c capabilities payload that contains only the matching caps in `alwaysMatch`
    processedW3CCapabilities = {
      alwaysMatch: {...insertAppiumPrefixes(desiredCaps)},
      firstMatch: [{}],
    };
  }

  return /** @type {ParsedDriverCaps<C,J>} */ ({
    desiredCaps,
    processedJsonwpCapabilities,
    processedW3CCapabilities,
    protocol,
  });
}

/**
 * Takes a capabilities objects and prefixes capabilities with `appium:`
 * @template {Constraints} [C={}]
 * @param {Capabilities<C>} caps - Desired capabilities object
 * @returns {NSCapabilities<C>}
 */
export function insertAppiumPrefixes(caps) {
  return /** @type {NSCapabilities<C>} */ (
    _.mapKeys(caps, (_, key) =>
      STANDARD_CAPS_LOWERCASE.has(key.toLowerCase()) || key.includes(':')
        ? key
        : `${W3C_APPIUM_PREFIX}:${key}`
    )
  );
}

/**
 * @template {Constraints} [C={}]
 * @param {NSCapabilities<C>} caps
 * @returns {Capabilities<C>}
 */
export function removeAppiumPrefixes(caps) {
  return /** @type {Capabilities<C>} */ (_.mapKeys(caps, (_, key) => removeAppiumPrefix(key)));
}

/**
 * @param {string} key
 * @returns {string}
 */
function removeAppiumPrefix(key) {
  const prefix = `${W3C_APPIUM_PREFIX}:`;
  return _.startsWith(key, prefix) ? key.substring(prefix.length) : key;
}

/**
 *
 * @param {string} pkgName
 * @returns {string|undefined}
 */
export function getPackageVersion(pkgName) {
  const pkgInfo = require(`${pkgName}/package.json`) || {};
  return pkgInfo.version;
}

/**
 * Adjusts NODE_PATH environment variable,
 * so drivers and plugins could load their peer dependencies.
 * Read https://nodejs.org/api/modules.html#loading-from-the-global-folders
 * for more details.
 * @returns {void}
 */
export function adjustNodePath() {
  const selfRoot = node.getModuleRootSync('appium', __filename);
  if (!selfRoot || path.dirname(selfRoot).length >= selfRoot.length) {
    return;
  }
  const nodeModulesRoot = path.dirname(selfRoot);

  const refreshRequirePaths = () => {
    try {
      // ! This hack allows us to avoid modification of import
      // ! statements in client modules. It uses a private API though,
      // ! so it could break (maybe, eventually).
      // See https://gist.github.com/branneman/8048520#7-the-hack
      // @ts-ignore see above comment

      require('module').Module._initPaths();
      return true;
    } catch {
      return false;
    }
  };

  if (!process.env.NODE_PATH) {
    process.env.NODE_PATH = nodeModulesRoot;
    if (refreshRequirePaths()) {
      process.env.APPIUM_OMIT_PEER_DEPS = '1';
    } else {
      delete process.env.NODE_PATH;
    }
    return;
  }

  const nodePathParts = process.env.NODE_PATH.split(path.delimiter);
  if (nodePathParts.includes(nodeModulesRoot)) {
    process.env.APPIUM_OMIT_PEER_DEPS = '1';
    return;
  }

  nodePathParts.push(nodeModulesRoot);
  process.env.NODE_PATH = nodePathParts.join(path.delimiter);
  if (refreshRequirePaths()) {
    process.env.APPIUM_OMIT_PEER_DEPS = '1';
  } else {
    process.env.NODE_PATH = _.without(nodePathParts, nodeModulesRoot).join(path.delimiter);
  }
}

/**
 * Pulls the initial values of Appium settings from the given capabilities argument.
 * Each setting item must satisfy the following format:
 * `settings[setting_name]: setting_value`
 * or
 * ```
 * settings = {
 *   setting_name1: 'setting_value1',
 *   setting_name2: 'setting_value2',
 * }
 * ```
 * The capabilities argument itself gets mutated, so it does not contain parsed
 * settings anymore to avoid further parsing issues.
 * Check
 * https://appium.io/docs/en/latest/guides/settings/
 * for more details on the available settings.
 *
 * @param {?Object} caps - Capabilities dictionary. It is mutated if
 * one or more settings have been pulled from it
 * @return {Object} - An empty dictionary if the given caps contains no
 * setting items or a dictionary containing parsed Appium setting names along with
 * their values.
 */
export function pullSettings(caps) {
  if (!_.isPlainObject(caps) || _.isEmpty(caps)) {
    return {};
  }

  const result = {};
  const singleSettings = {};
  for (const [key, value] of _.toPairs(caps)) {
    let match;
    if (/^(s|appium:s)ettings$/.test(key) && _.isPlainObject(value)) {
      Object.assign(result, value);
      delete caps[key];
    } else if ((match = /^(s|appium:s)ettings\[(\S+)\]$/.exec(key))) {
      singleSettings[match[2]] = value;
      delete caps[key];
    }
  }
  if (!_.isEmpty(singleSettings)) {
    Object.assign(result, singleSettings);
  }
  return result;
}

/**
 * @template {CliCommand} [Cmd=ServerCommand]
 * @template {CliExtensionSubcommand|void} [SubCmd=void]
 * @param {Args<Cmd, SubCmd>} args
 * @returns {args is Args<ServerCommand>}
 */
export function isServerCommandArgs(args) {
  return args.subcommand === SERVER_SUBCOMMAND;
}

/**
 * @template {CliCommand} Cmd
 * @template {CliExtensionSubcommand|CliCommandSetupSubcommand|void} [SubCmd=void]
 * @param {Args<Cmd, SubCmd>} args
 * @returns {args is Args<SetupCommand>}
 */
export function isSetupCommandArgs(args) {
  return args.subcommand === SETUP_SUBCOMMAND;
}

/**
 * @template {CliCommand} [Cmd=ServerCommand]
 * @template {CliExtensionSubcommand|void} [SubCmd=void]
 * @param {Args<Cmd, SubCmd>} args
 * @returns {args is Args<CliExtensionCommand, SubCmd>}
 */
export function isExtensionCommandArgs(args) {
  return args.subcommand === DRIVER_TYPE || args.subcommand === PLUGIN_TYPE;
}

/**
 * @template {CliCommand} Cmd
 * @template {CliExtensionSubcommand} SubCmd
 * @param {Args<Cmd, SubCmd>} args
 * @returns {args is Args<DriverCommand, SubCmd>}
 */
export function isDriverCommandArgs(args) {
  return args.subcommand === DRIVER_TYPE;
}

/**
 * @template {CliCommand} Cmd
 * @template {CliExtensionSubcommand} SubCmd
 * @param {Args<Cmd, SubCmd>} args
 * @returns {args is Args<PluginCommand, SubCmd>}
 */
export function isPluginCommandArgs(args) {
  return args.subcommand === PLUGIN_TYPE;
}

/**
 * Fetches the list of matched network interfaces of the current host.
 *
 * @param {4|6|null} family Either 4 to include ipv4 addresses only,
 * 6 to include ipv6 addresses only, or null to include all of them
 * @returns {os.NetworkInterfaceInfo[]} The list of matched interfaces
 */
export function fetchInterfaces (family = null) {
  let familyValue = null;
  // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
  if (family === 4) {
    familyValue = [4, 'IPv4'];
  } else if (family === 6) {
    familyValue = [6, 'IPv6'];
  }
  // @ts-ignore The linter does not understand the below filter
  return _.flatMap(_.values(os.networkInterfaces()).filter(Boolean))
    // @ts-ignore The linter does not understand the above filter
    .filter(({family}) => !familyValue || familyValue && familyValue.includes(family));
}

/**
 * https://github.com/SheetJS/js-adler32
 *
 * @param {string} str
 * @param {number?} [seed]
 * @returns {number}
 */
export function adler32(str, seed = null) {
	let a = 1, b = 0, L = str.length, M = 0, c = 0, d = 0;
	if (typeof seed === 'number') {
    a = seed & 0xFFFF;
    b = seed >>> 16;
  }
	for (let i = 0; i < L;) {
		M = Math.min(L - i, 2918);
		while (M > 0) {
			c = str.charCodeAt(i++);
			if (c < 0x80) {
        a += c;
      }
			else if (c < 0x800) {
				a += 192 | ((c >> 6) & 31);
        b += a;
        --M;
				a += 128 | (c & 63);
			} else if (c >= 0xD800 && c < 0xE000) {
				c = (c & 1023) + 64;
        d = str.charCodeAt(i++) & 1023;
				a += 240 | ((c >> 8) & 7);
        b += a;
        --M;
				a += 128 | ((c >> 2) & 63);
        b += a;
        --M;
				a += 128 | ((d >> 6) & 15) | ((c & 3) << 4);
        b += a;
        --M;
				a += 128 | (d & 63);
			} else {
				a += 224 | ((c >> 12) & 15);
        b += a;
        --M;
				a += 128 | ((c >> 6) & 63);
        b += a;
        --M;
				a += 128 | (c & 63);
			}
			b += a;
      --M;
		}
		a = (15 * (a >>> 16) + (a & 65535));
		b = (15 * (b >>> 16) + (b & 65535));
	}
	return ((b % 65521) << 16) | (a % 65521);
}

/**
 * Checks if the provided address is a broadcast one.
 *
 * @param {string} address
 * @returns {boolean}
 */
export function isBroadcastIp(address) {
  return [V4_BROADCAST_IP, V6_BROADCAST_IP, `[${V6_BROADCAST_IP}]`].includes(address);
}

/**
 * @typedef {import('@appium/types').StringRecord} StringRecord
 * @typedef {import('@appium/types').BaseDriverCapConstraints} BaseDriverCapConstraints
 */

/**
 * @template {Constraints} [C=BaseDriverCapConstraints]
 * @template [J=any]
 * @typedef ParsedDriverCaps
 * @property {Capabilities<C>} desiredCaps
 * @property {string} protocol
 * @property {J} [processedJsonwpCapabilities]
 * @property {W3CCapabilities<C>} [processedW3CCapabilities]
 */

/**
 * @todo protocol is more specific
 * @template {Constraints} [C=BaseDriverCapConstraints]
 * @template [J=any]
 * @typedef InvalidCaps
 * @property {Error} error
 * @property {string} protocol
 * @property {Capabilities<C>} [desiredCaps]
 * @property {J} [processedJsonwpCapabilities]
 * @property {W3CCapabilities<C>} [processedW3CCapabilities]
 */

/**
 * @template {Constraints} C
 * @typedef {import('@appium/types').Capabilities<C>} Capabilities
 */

/**
 * @template {Constraints} C
 * @typedef {import('@appium/types').W3CCapabilities<C>} W3CCapabilities
 */

/**
 * @template {Constraints} C
 * @typedef {import('@appium/types').NSCapabilities<C>} NSCapabilities
 */

/**
 * @template {Constraints} C
 * @typedef {import('@appium/types').ConstraintsToCaps<C>} ConstraintsToCaps
 */

/**
 * @template T
 * @typedef {import('type-fest').StringKeyOf<T>} StringKeyOf
 */

/**
 * @typedef {import('@appium/types').Constraints} Constraints
 */

/**
 * @typedef {import('appium/types').CliCommand} CliCommand
 * @typedef {import('appium/types').CliExtensionSubcommand} CliExtensionSubcommand
 * @typedef {import('appium/types').CliExtensionCommand} CliExtensionCommand
 * @typedef {import('appium/types').CliCommandSetupSubcommand} CliCommandSetupSubcommand
 * @typedef {import('appium/types').CliCommandServer} ServerCommand
 * @typedef {import('appium/types').CliCommandDriver} DriverCommand
 * @typedef {import('appium/types').CliCommandPlugin} PluginCommand
 * @typedef {import('appium/types').CliCommandSetup} SetupCommand
 */

/**
 * @template {CliCommand} [Cmd=ServerCommand]
 * @template {CliExtensionSubcommand|CliCommandSetupSubcommand|void} [SubCmd=void]
 * @typedef {import('appium/types').Args<Cmd, SubCmd>} Args
 */

/**
 * @template {CliCommand} [Cmd=ServerCommand]
 * @template {CliExtensionSubcommand|CliCommandSetupSubcommand|void} [SubCmd=void]
 * @typedef {import('appium/types').ParsedArgs<Cmd, SubCmd>} ParsedArgs
 */

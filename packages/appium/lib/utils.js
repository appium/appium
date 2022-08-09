import _ from 'lodash';
import logger from './logger';
import {processCapabilities, PROTOCOLS} from '@appium/base-driver';
import {inspect as dump} from 'util';
import {fs} from '@appium/support';
import path from 'path';

const W3C_APPIUM_PREFIX = 'appium';

/**
 *
 * If `stdout` is a TTY, this is `true`.
 *
 * Used for tighter control over log output.
 * @type {boolean}
 */
const isStdoutTTY = process.stdout.isTTY;

/**
 * Dumps to value to the console using `info` logger.
 *
 * @todo May want to force color to be `false` if {@link isStdoutTTY} is `false`.
 */
const inspect = _.flow(
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
 * @param {any} jsonwpCapabilities
 * @param {W3CCapabilities} w3cCapabilities
 * @param {import('@appium/types').Constraints} constraints
 * @param {import('@appium/types').DefaultCapabilitiesConfig} [defaultCapabilities]
 * @returns {ParsedDriverCaps|InvalidCaps}
 */
function parseCapsForInnerDriver(
  jsonwpCapabilities,
  w3cCapabilities,
  constraints = {},
  defaultCapabilities = {}
) {
  // Check if the caller sent JSONWP caps, W3C caps, or both
  const hasW3CCaps =
    _.isPlainObject(w3cCapabilities) &&
    (_.has(w3cCapabilities, 'alwaysMatch') || _.has(w3cCapabilities, 'firstMatch'));
  const hasJSONWPCaps = _.isPlainObject(jsonwpCapabilities);
  let desiredCaps = /** @type {ParsedDriverCaps['desiredCaps']} */ ({});
  /** @type {ParsedDriverCaps['processedW3CCapabilities']} */
  let processedW3CCapabilities;
  /** @type {ParsedDriverCaps['processedJsonwpCapabilities']} */
  let processedJsonwpCapabilities;

  if (!hasW3CCaps) {
    return /** @type {InvalidCaps} */ ({
      protocol: PROTOCOLS.W3C,
      error: new Error('W3C capabilities should be provided'),
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
        for (const firstMatchEntry of w3cCapabilities.firstMatch || []) {
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
          w3cCapabilities.firstMatch = [{[defaultCapKey]: defaultCapValue}];
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
      return /** @type {InvalidCaps} */ ({
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

  return /** @type {ParsedDriverCaps} */ ({
    desiredCaps,
    processedJsonwpCapabilities,
    processedW3CCapabilities,
    protocol,
  });
}

/**
 * Takes a capabilities objects and prefixes capabilities with `appium:`
 * @param {Capabilities} caps Desired capabilities object
 * @returns {AppiumW3CCapabilities}
 */
function insertAppiumPrefixes(caps) {
  // Standard, non-prefixed capabilities (see https://www.w3.org/TR/webdriver/#dfn-table-of-standard-capabilities)
  const STANDARD_CAPS = [
    'browserName',
    'browserVersion',
    'platformName',
    'acceptInsecureCerts',
    'pageLoadStrategy',
    'proxy',
    'setWindowRect',
    'timeouts',
    'unhandledPromptBehavior',
  ];

  let prefixedCaps = {};
  for (let [name, value] of _.toPairs(caps)) {
    if (STANDARD_CAPS.includes(name) || name.includes(':')) {
      prefixedCaps[name] = value;
    } else {
      prefixedCaps[`${W3C_APPIUM_PREFIX}:${name}`] = value;
    }
  }
  return prefixedCaps;
}

/**
 *
 * @param {AppiumW3CCapabilities} caps
 * @returns {Capabilities}
 */
function removeAppiumPrefixes(caps) {
  if (!_.isPlainObject(caps)) {
    return caps;
  }

  /** @type {Capabilities} */
  const fixedCaps = {};
  for (let [name, value] of _.toPairs(caps)) {
    fixedCaps[removeAppiumPrefix(name)] = value;
  }
  return fixedCaps;
}

function removeAppiumPrefix(key) {
  const prefix = `${W3C_APPIUM_PREFIX}:`;
  return _.startsWith(key, prefix) ? key.substring(prefix.length) : key;
}

function getPackageVersion(pkgName) {
  const pkgInfo = require(`${pkgName}/package.json`) || {};
  return pkgInfo.version;
}

/**
 * Adjusts NODE_PATH environment variable,
 * so drivers and plugins could load their peer dependencies.
 * Read https://nodejs.org/api/modules.html#loading-from-the-global-folders
 * for more details.
 * @returns {Promise<void>}
 */
async function adjustNodePath() {
  const pathParts = __filename.split(path.sep);
  let nodeModulesRoot = null;
  for (let folderIdx = pathParts.length - 1; folderIdx >= 0; folderIdx--) {
    const currentRoot = path.join(...(pathParts.slice(0, folderIdx + 1)));
    const manifestPath = path.join(currentRoot, 'package.json');
    if (!await fs.exists(manifestPath)) {
      continue;
    }
    try {
      if (JSON.parse(await fs.readFile(manifestPath, 'utf8')).name === 'appium') {
        nodeModulesRoot = currentRoot;
        break;
      }
    } catch (ign) {}
  }
  if (!nodeModulesRoot) {
    return;
  }

  if (!process.env.NODE_PATH) {
    logger.info(`Setting NODE_PATH to '${nodeModulesRoot}'`);
    process.env.NODE_PATH = nodeModulesRoot;
    return;
  }

  const nodePathParts = process.env.NODE_PATH.split(path.delimiter);
  if (nodePathParts.includes(nodeModulesRoot)) {
    return;
  }

  nodePathParts.push(nodeModulesRoot);
  logger.info(`Adding '${nodeModulesRoot}' to NODE_PATH`);
  process.env.NODE_PATH = nodePathParts.join(path.delimiter);
}

/**
 * Pulls the initial values of Appium settings from the given capabilities argument.
 * Each setting item must satisfy the following format:
 * `setting[setting_name]: setting_value`
 * The capabilities argument itself gets mutated, so it does not contain parsed
 * settings anymore to avoid further parsing issues.
 * Check
 * https://github.com/appium/appium/blob/master/docs/en/advanced-concepts/settings.md
 * for more details on the available settings.
 *
 * @param {?Object} caps - Capabilities dictionary. It is mutated if
 * one or more settings have been pulled from it
 * @return {Object} - An empty dictionary if the given caps contains no
 * setting items or a dictionary containing parsed Appium setting names along with
 * their values.
 */
function pullSettings(caps) {
  if (!_.isPlainObject(caps) || _.isEmpty(caps)) {
    return {};
  }

  const result = {};
  for (const [key, value] of _.toPairs(caps)) {
    const match = /\bsettings\[(\S+)\]$/.exec(key);
    if (!match) {
      continue;
    }

    result[match[1]] = value;
    delete caps[key];
  }
  return result;
}

export {
  inspect,
  parseCapsForInnerDriver,
  insertAppiumPrefixes,
  getPackageVersion,
  pullSettings,
  removeAppiumPrefixes,
  adjustNodePath,
};

/**
 * @todo protocol is more specific
 * @typedef ParsedDriverCaps
 * @property {Capabilities} desiredCaps
 * @property {string} protocol
 * @property {any} [processedJsonwpCapabilities]
 * @property {W3CCapabilities} [processedW3CCapabilities]
 */

/**
 * @todo protocol is more specific
 * @typedef InvalidCaps
 * @property {Error} error
 * @property {string} protocol
 * @property {Capabilities} [desiredCaps]
 * @property {any} [processedJsonwpCapabilities]
 * @property {W3CCapabilities} [processedW3CCapabilities]
 */

/**
 * @typedef {import('@appium/types').W3CCapabilities} W3CCapabilities
 * @typedef {import('@appium/types').Capabilities} Capabilities
 * @typedef {import('@appium/types').AppiumW3CCapabilities} AppiumW3CCapabilities
 */

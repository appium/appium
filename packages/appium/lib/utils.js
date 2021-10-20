import _ from 'lodash';
import logger from './logger';
import { processCapabilities, PROTOCOLS } from '@appium/base-driver';
import { fs } from '@appium/support';

const W3C_APPIUM_PREFIX = 'appium';

function inspectObject (args) {
  function getValueArray (obj, indent = '  ') {
    if (!_.isObject(obj)) {
      return [obj];
    }

    let strArr = ['{'];
    for (let [arg, value] of _.toPairs(obj)) {
      if (!_.isObject(value)) {
        strArr.push(`${indent}  ${arg}: ${value}`);
      } else {
        value = getValueArray(value, `${indent}  `);
        strArr.push(`${indent}  ${arg}: ${value.shift()}`);
        strArr.push(...value);
      }
    }
    strArr.push(`${indent}}`);
    return strArr;
  }
  for (let [arg, value] of _.toPairs(args)) {
    value = getValueArray(value);
    logger.info(`  ${arg}: ${value.shift()}`);
    for (let val of value) {
      logger.info(val);
    }
  }
}

/**
 * Takes the caps that were provided in the request and translates them
 * into caps that can be used by the inner drivers.
 *
 * @param {Object} jsonwpCapabilities
 * @param {Object} w3cCapabilities
 * @param {Object} constraints
 * @param {Object} defaultCapabilities
 */
function parseCapsForInnerDriver (jsonwpCapabilities, w3cCapabilities, constraints = {}, defaultCapabilities = {}) {
  // Check if the caller sent JSONWP caps, W3C caps, or both
  const hasW3CCaps = _.isPlainObject(w3cCapabilities) &&
    (_.has(w3cCapabilities, 'alwaysMatch') || _.has(w3cCapabilities, 'firstMatch'));
  const hasJSONWPCaps = _.isPlainObject(jsonwpCapabilities);
  let desiredCaps = {};
  let processedW3CCapabilities = null;
  let processedJsonwpCapabilities = null;

  if (!hasW3CCaps) {
    return {
      protocol: PROTOCOLS.W3C,
      error: new Error('W3C capabilities should be provided'),
    };
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
        for (const firstMatchEntry of (w3cCapabilities.firstMatch || [])) {
          if (_.isPlainObject(firstMatchEntry)
              && _.has(removeAppiumPrefixes(firstMatchEntry), removeAppiumPrefix(defaultCapKey))) {
            isCapAlreadySet = true;
            break;
          }
        }
        // Check if the key is already present in alwaysMatch entries
        isCapAlreadySet = isCapAlreadySet || (_.isPlainObject(w3cCapabilities.alwaysMatch)
          && _.has(removeAppiumPrefixes(w3cCapabilities.alwaysMatch), removeAppiumPrefix(defaultCapKey)));
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
      jsonwpCapabilities = Object.assign({}, removeAppiumPrefixes(defaultCapabilities), jsonwpCapabilities);
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
      return {
        desiredCaps,
        processedJsonwpCapabilities,
        processedW3CCapabilities,
        protocol,
        error,
      };
    }

    // Create a new w3c capabilities payload that contains only the matching caps in `alwaysMatch`
    processedW3CCapabilities = {
      alwaysMatch: {...insertAppiumPrefixes(desiredCaps)},
      firstMatch: [{}],
    };
  }

  return {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities, protocol};
}

/**
 * Takes a capabilities objects and prefixes capabilities with `appium:`
 * @param {Object} caps Desired capabilities object
 */
function insertAppiumPrefixes (caps) {
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
    'unhandledPromptBehavior'
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

function removeAppiumPrefixes (caps) {
  if (!_.isPlainObject(caps)) {
    return caps;
  }

  const fixedCaps = {};
  for (let [name, value] of _.toPairs(caps)) {
    fixedCaps[removeAppiumPrefix(name)] = value;
  }
  return fixedCaps;
}

function removeAppiumPrefix (key) {
  const prefix = `${W3C_APPIUM_PREFIX}:`;
  return _.startsWith(key, prefix) ? key.substring(prefix.length) : key;
}

function getPackageVersion (pkgName) {
  const pkgInfo = require(`${pkgName}/package.json`) || {};
  return pkgInfo.version;
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
function pullSettings (caps) {
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

const rootDir = fs.findRoot(__dirname);


/**
 * A Map where you can set properties, but only once. And you can't remove anything. So there.
 * @template K,V
 * @extends {Map<K,V>}
 */
class ReadonlyMap extends Map {
  /**
   * @param {K} key
   * @param {V} value
   */
  set (key, value) {
    if (this.has(key)) {
      throw new Error(`${key} is already set`);
    }
    return super.set(key, value);
  }

  delete (key) {
    throw new Error(`${key} cannot be deleted`);
  }

  clear () {
    throw new Error(`Cannot clear ReadonlyMap`);
  }
}

export {
  inspectObject, parseCapsForInnerDriver, insertAppiumPrefixes, rootDir,
  getPackageVersion, pullSettings, removeAppiumPrefixes, ReadonlyMap
};

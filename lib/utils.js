import _ from 'lodash';
import logger from './logger';
import { processCapabilities, BaseDriver } from 'appium-base-driver';
import findRoot from 'find-root';

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
  let protocol = null;
  let desiredCaps = {};
  let processedW3CCapabilities = null;
  let processedJsonwpCapabilities = null;

  if (!hasJSONWPCaps && !hasW3CCaps) {
    return {
      protocol: BaseDriver.DRIVER_PROTOCOL.W3C,
      error: new Error('Either JSONWP or W3C capabilities should be provided'),
    };
  }

  const {W3C, MJSONWP} = BaseDriver.DRIVER_PROTOCOL;

  // Make copies of the capabilities that include the default capabilities
  if (hasW3CCaps) {
    w3cCapabilities = {
      ...w3cCapabilities,
      alwaysMatch: {
        ...defaultCapabilities,
        ...w3cCapabilities.alwaysMatch,
      },
    };
  }

  if (hasJSONWPCaps) {
    jsonwpCapabilities = {
      ...defaultCapabilities,
      ...jsonwpCapabilities,
    };
  }

  // Get MJSONWP caps
  if (hasJSONWPCaps) {
    protocol = MJSONWP;
    desiredCaps = jsonwpCapabilities;
    processedJsonwpCapabilities = removeW3CPrefixes({...desiredCaps});
  }

  // Get W3C caps
  if (hasW3CCaps) {
    protocol = W3C;
    // Call the process capabilities algorithm to find matching caps on the W3C
    // (see: https://github.com/jlipps/simple-wd-spec#processing-capabilities)
    let isFixingNeededForW3cCaps = false;
    try {
      desiredCaps = processCapabilities(w3cCapabilities, constraints, true);
    } catch (error) {
      if (!hasJSONWPCaps) {
        return {
          desiredCaps,
          processedJsonwpCapabilities,
          processedW3CCapabilities,
          protocol,
          error,
        };
      }
      logger.info(`Could not parse W3C capabilities: ${error.message}`);
      isFixingNeededForW3cCaps = true;
    }

    if (hasJSONWPCaps && !isFixingNeededForW3cCaps) {
      const differingKeys = _.difference(_.keys(processedJsonwpCapabilities), _.keys(removeW3CPrefixes(desiredCaps)));
      if (!_.isEmpty(differingKeys)) {
        logger.info(`The following capabilities were provided in the JSONWP desired capabilities that are missing ` +
          `in W3C capabilities: ${JSON.stringify(differingKeys)}`);
        isFixingNeededForW3cCaps = true;
      }
    }

    if (isFixingNeededForW3cCaps && hasJSONWPCaps) {
      logger.info('Trying to fix W3C capabilities by merging them with JSONWP caps');
      w3cCapabilities = fixW3cCapabilities(w3cCapabilities, jsonwpCapabilities);
      try {
        desiredCaps = processCapabilities(w3cCapabilities, constraints, true);
      } catch (error) {
        logger.warn(`Could not parse fixed W3C capabilities: ${error.message}. Falling back to JSONWP protocol`);
        return {
          desiredCaps: processedJsonwpCapabilities,
          processedJsonwpCapabilities,
          processedW3CCapabilities: null,
          protocol: MJSONWP,
        };
      }
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
 * This helper method tries to fix corrupted W3C capabilities by
 * merging them to existing JSONWP capabilities.
 *
 * @param {Object} w3cCaps W3C capabilities
 * @param {Object} jsonwpCaps JSONWP capabilities
 * @returns {Object} Fixed W3C capabilities
 */
function fixW3cCapabilities (w3cCaps, jsonwpCaps) {
  const result = {
    firstMatch: w3cCaps.firstMatch || [],
    alwaysMatch: w3cCaps.alwaysMatch || {},
  };
  const keysToInsert = _.keys(jsonwpCaps);
  const removeMatchingKeys = (match) => {
    _.pull(keysToInsert, match);
    const colonIndex = match.indexOf(':');
    if (colonIndex >= 0 && match.length > colonIndex) {
      _.pull(keysToInsert, match.substring(colonIndex + 1));
    }
    if (keysToInsert.includes(`${W3C_APPIUM_PREFIX}:${match}`)) {
      _.pull(keysToInsert, `${W3C_APPIUM_PREFIX}:${match}`);
    }
  };

  for (const firstMatchEntry of result.firstMatch) {
    for (const pair of _.toPairs(firstMatchEntry)) {
      removeMatchingKeys(pair[0]);
    }
  }

  for (const pair of _.toPairs(result.alwaysMatch)) {
    removeMatchingKeys(pair[0]);
  }

  for (const key of keysToInsert) {
    result.alwaysMatch[key] = jsonwpCaps[key];
  }
  return result;
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

function removeW3CPrefixes (caps) {
  if (!_.isPlainObject(caps)) {
    return caps;
  }

  const fixedCaps = {};
  for (let [name, value] of _.toPairs(caps)) {
    const colonPos = name.indexOf(':');
    const key = colonPos > 0 ? name.substring(colonPos + 1) : name;
    fixedCaps[key] = value;
  }
  return fixedCaps;
}

const rootDir = findRoot(__dirname);

export { inspectObject, parseCapsForInnerDriver, insertAppiumPrefixes, rootDir };

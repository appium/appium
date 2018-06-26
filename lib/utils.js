import _ from 'lodash';
import logger from './logger';
import { processCapabilities, BaseDriver } from 'appium-base-driver';
import findRoot from 'find-root';

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
 * @param {Object} jsonwpCaps
 * @param {Object} w3cCapabilities
 * @param {Object} constraints
 * @param {Object} defaultCapabilities
 */
function parseCapsForInnerDriver (jsonwpCaps, w3cCapabilities, constraints={}, defaultCapabilities={}) {
  // Check if the caller sent JSONWP caps, W3C caps, or both
  const hasW3CCaps = _.isPlainObject(w3cCapabilities);
  const hasJSONWPCaps = _.isPlainObject(jsonwpCaps);

  let protocol;

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
    jsonwpCaps = {
      ...defaultCapabilities,
      ...jsonwpCaps,
    };
  }

  // Get MJSONWP caps
  let desiredCaps = {};
  let processedJsonwpCapabilities = null;
  if (hasJSONWPCaps) {
    protocol = MJSONWP;
    desiredCaps = jsonwpCaps;
    processedJsonwpCapabilities = {...desiredCaps};
  }

  // Get W3C caps
  let processedW3CCapabilities = null;
  let error;
  if (hasW3CCaps) {
    protocol = W3C;
    // Call the process capabilities algorithm to find matching caps on the W3C
    // (see: https://github.com/jlipps/simple-wd-spec#processing-capabilities)
    try {
      desiredCaps = processCapabilities(w3cCapabilities, constraints, true);
    } catch (err) {
      if (jsonwpCaps) {
        logger.warn(`Could not parse W3C capabilities: ${err.message}. Falling back to JSONWP protocol.`);
        return {
          desiredCaps: removeW3CPrefixes(desiredCaps),
          processedJsonwpCapabilities: removeW3CPrefixes(processedJsonwpCapabilities),
          processedW3CCapabilities: null,
          protocol: MJSONWP,
        };
      }
      error = err;
    }

    // Create a new w3c capabilities payload that contains only the matching caps in `alwaysMatch`
    processedW3CCapabilities = {
      alwaysMatch: {...insertAppiumPrefixes(desiredCaps)},
      firstMatch: [{}],
    };

    // If we found extraneuous keys in JSONWP caps, fall back to JSONWP
    if (hasJSONWPCaps) {
      let differingKeys = _.difference(_.keys(jsonwpCaps), _.keys(desiredCaps));
      if (!_.isEmpty(differingKeys)) {
        logger.warn(`The following capabilities were provided in the JSONWP desired capabilities that are missing ` +
          `in W3C capabilities: ${JSON.stringify(differingKeys)}. Falling back to JSONWP protocol.`);
        protocol = MJSONWP;
        desiredCaps = jsonwpCaps;
        return {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities: null, protocol};
      }
    }
  }

  return {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities, protocol, error};
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
      prefixedCaps[`appium:${name}`] = value;
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

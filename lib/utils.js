import _ from 'lodash';
import logger from './logger';
import { processCapabilities } from 'appium-base-driver';


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
  if (hasJSONWPCaps) {
    desiredCaps = jsonwpCaps;
  }

  // Get W3C caps
  if (hasW3CCaps) {
    // Call the process capabilities algorithm to find matching caps on the W3C
    // (see: https://github.com/jlipps/simple-wd-spec#processing-capabilities)
    let matchingW3CCaps = processCapabilities(w3cCapabilities, constraints, true);

    if (hasJSONWPCaps) {
      let jsonwpKeys = _.keys(desiredCaps);
      let matchingW3CCapsKeys = _.keys(matchingW3CCaps);

      // If JSONWP has keys that W3C doesn't have, log a warning message
      let differingKeys = _.differenceWith(jsonwpKeys, matchingW3CCapsKeys);
      if (!_.isEmpty(differingKeys)) {
        logger.warn(`The following capabilities were provided in the JSONWP desired capabilities but
          not the W3C capabilities: ${JSON.stringify(differingKeys)}`);
      }
    }

    // If JSONWP caps and W3C caps were provided and there are discrepancies between them
    // we'll be forgiving for now and just merge the two. But in the future, the clients
    // should not be sending discrepant caps and Appium should ignore the extraneous MJSONWP caps
    desiredCaps = {
      ...desiredCaps, // TODO: This line should be removed once we decide to not allow discrepent caps
      ...matchingW3CCaps,
    };
  }

  let processedJsonwpCaps = null;
  let processedW3CCapabilities = null;

  // Create new JSONWP desired capabilities and W3C 'capabilities' objects that have the reconciled attributes
  if (hasJSONWPCaps) {
    processedJsonwpCaps = {...desiredCaps};
  }

  // Translate the matched W3C caps back into W3C capabilities object so that it
  // can be proxied to the inner driver
  if (hasW3CCaps) {
    processedW3CCapabilities = {
      alwaysMatch: {...insertAppiumPrefixes(desiredCaps)}, // Insert 'appium:' prefix to non-prefixed caps so that the Inner Driver doesn't complain about bad W3C prefixes
      firstMatch: [{}],
    };
  }

  return {desiredCaps, processedJsonwpCaps, processedW3CCapabilities};
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

export { inspectObject, parseCapsForInnerDriver, insertAppiumPrefixes };

import _ from 'lodash';
import { validator } from './desired-caps';
import { util } from 'appium-support';
import log from './logger';

// Takes primary caps object and merges it into a secondary caps object.
// (see https://www.w3.org/TR/webdriver/#dfn-merging-capabilities)
function mergeCaps (primary = {}, secondary = {}) {
  let result = Object.assign({}, primary);

  for (let [name, value] of _.toPairs(secondary)) {
    // Overwriting is not allowed. Primary and secondary must have different properties (w3c rule 4.4)
    if (!_.isUndefined(primary[name])) {
      throw new Error(`property ${name} should not exist on both primary and secondary`);
    }
    result[name] = value;
  }

  return result;
}

// Validates caps against a set of constraints
function validateCaps (caps, constraints = {}, skipPresenceConstraint = false) {
  if (!_.isObject(caps)) {
    throw new Error(`must be a JSON object`);
  }

  constraints = _.cloneDeep(constraints); // Defensive copy

  // Remove the 'presence' constraint if we're not checking for it
  if (skipPresenceConstraint) {
    for (let key of Object.keys(constraints)) {
      delete constraints[key].presence;
    }
  }

  let validationErrors = validator.validate(_.pickBy(caps, util.hasValue),
                                              constraints,
                                              {fullMessages: false});

  if (validationErrors) {
    let message = [];
    for (let [attribute, reasons] of _.toPairs(validationErrors)) {
      for (let reason of reasons) {
        message.push(` ${attribute} ${reason},`);
      }
    }
    throw new Error(message.join(''));
  }

  // Return caps
  return caps;
}

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

function isStandardCap (cap) {
  return !!_.find(STANDARD_CAPS, (standardCap) => standardCap.toLowerCase() === `${cap}`.toLowerCase());
}

// If the 'appium:' prefix was provided and it's a valid capability, strip out the prefix (see https://www.w3.org/TR/webdriver/#dfn-extension-capabilities)
// (NOTE: Method is destructive and mutates contents of caps)
function stripAppiumPrefixes (caps) {
  const prefix = 'appium:';
  const prefixedCaps = _.filter(_.keys(caps), cap => `${cap}`.startsWith(prefix));
  const badPrefixedCaps = [];
  const unprefixedCaps = _.filter(_.keys(caps), (cap) => (
    !cap.includes(':') && !isStandardCap(cap)
  ));

  // Strip out the 'appium:' prefix
  for (let prefixedCap of prefixedCaps) {
    const strippedCapName = prefixedCap.substr(prefix.length);

    // If it's standard capability that was prefixed, add it to an array of incorrectly prefixed capabilities
    if (isStandardCap(strippedCapName)) {
      badPrefixedCaps.push(strippedCapName);
    }

    // Strip out the prefix
    caps[strippedCapName] = caps[prefixedCap];
    delete caps[prefixedCap];
  }

  // If we found standard caps that were incorrectly prefixed, throw an exception (e.g.: don't accept 'appium:platformName', only accept just 'platformName')
  if (badPrefixedCaps.length > 0) {
    throw new Error(`The capabilities ${JSON.stringify(badPrefixedCaps)} are standard capabilities and should not have the "appium:" prefix`);
  }

  // If client provides non-prefixed, non-standard capabilities, warn them that these should be prefixed
  if (unprefixedCaps.length > 0) {
    log.warn(`${JSON.stringify(unprefixedCaps)} are not standard capabilities and should have an extension prefix`);
  }
}

// Parse capabilities (based on https://www.w3.org/TR/webdriver/#processing-capabilities)
function parseCaps (caps, constraints = {}, shouldValidateCaps = true) {
  if (!_.isObject(caps)) {
    throw new Error('The capabilities argument was not valid for the following reason(s): "capabilities" must be a JSON object.');
  }

  let {alwaysMatch: requiredCaps, firstMatch: allFirstMatchCaps = []} = caps;

  if (!_.isObject(requiredCaps)) {
    requiredCaps = {};
  }

  // Reject 'firstMatch' argument if it's not an array (see spec #3.2)
  if (!_.isArray(allFirstMatchCaps)) {
    throw new Error('The capabilities.firstMatch argument was not valid for the following reason(s): "capabilities.firstMatch" must be a JSON array or undefined');
  }

  // Strip out the 'appium:' prefix
  stripAppiumPrefixes(requiredCaps);
  for (let firstMatchCaps of allFirstMatchCaps) {
    stripAppiumPrefixes(firstMatchCaps);
  }

  if (shouldValidateCaps) {
    requiredCaps = validateCaps(requiredCaps, constraints);
  }

  // Validate all of the first match capabilities (see spec #5)
  let validatedFirstMatchCaps = allFirstMatchCaps.map((firstMatchCaps) => {
    try {
      // Validate firstMatch caps (don't validate 'presence' though, 'presence' is only validated in alwaysMatch)
      return shouldValidateCaps ? validateCaps(firstMatchCaps, constraints, true) : firstMatchCaps;
    } catch (e) {
      throw new Error(`The capabilities.firstMatch argument was not valid for the following reason: ${JSON.stringify(firstMatchCaps)} ${e.message}`);
    }
  });

  // Try to merge requiredCaps with first match capabilities, break once it finds its first match (see spec #6)
  let matchedCaps = null;
  for (let firstMatchCaps of validatedFirstMatchCaps) {
    try {
      matchedCaps = mergeCaps(requiredCaps, firstMatchCaps);
      if (matchedCaps) {
        break;
      }
    } catch (ign) { }
  }

  // If there was no match, use the de-facto requiredCaps on its own
  matchedCaps = matchedCaps || requiredCaps;

  // Returns variables for testing purposes
  return {requiredCaps, allFirstMatchCaps, validatedFirstMatchCaps, matchedCaps};
}

// Calls parseCaps and just returns the matchedCaps variable
function processCapabilities (caps, constraints = {}, shouldValidateCaps = true) {
  return parseCaps(caps, constraints, shouldValidateCaps).matchedCaps;
}


export default { parseCaps, processCapabilities, validateCaps, mergeCaps };

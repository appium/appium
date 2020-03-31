import _ from 'lodash';
import { validator } from './desired-caps';
import { util } from 'appium-support';
import log from './logger';
import { errors } from '../protocol/errors';

// Takes primary caps object and merges it into a secondary caps object.
// (see https://www.w3.org/TR/webdriver/#dfn-merging-capabilities)
function mergeCaps (primary = {}, secondary = {}) {
  let result = Object.assign({}, primary);

  for (let [name, value] of _.toPairs(secondary)) {
    // Overwriting is not allowed. Primary and secondary must have different properties (w3c rule 4.4)
    if (!_.isUndefined(primary[name])) {
      throw new errors.InvalidArgumentError(`property '${name}' should not exist on both primary (${JSON.stringify(primary)}) and secondary (${JSON.stringify(secondary)}) object`);
    }
    result[name] = value;
  }

  return result;
}

// Validates caps against a set of constraints
function validateCaps (caps, constraints = {}, opts = {}) {

  let {skipPresenceConstraint} = opts;

  if (!_.isPlainObject(caps)) {
    throw new errors.InvalidArgumentError(`must be a JSON object`);
  }

  constraints = _.cloneDeep(constraints); // Defensive copy

  if (skipPresenceConstraint) {
    // Remove the 'presence' constraint if we're not checking for it
    for (let key of _.keys(constraints)) {
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
        message.push(`'${attribute}' ${reason}`);
      }
    }
    throw new errors.InvalidArgumentError(message.join('; '));
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
  const prefixedCaps = _.filter(_.keys(caps), (cap) => `${cap}`.startsWith(prefix));
  const badPrefixedCaps = [];

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
    throw new errors.InvalidArgumentError(`The capabilities ${JSON.stringify(badPrefixedCaps)} are standard capabilities and should not have the "appium:" prefix`);
  }
}

/**
 * Get an array of all the unprefixed caps that are being used in 'alwaysMatch' and all of the 'firstMatch' object
 * @param {Object} caps A capabilities object
 */
function findNonPrefixedCaps ({alwaysMatch = {}, firstMatch = []}) {
  return _.chain([alwaysMatch, ...firstMatch])
    .reduce((unprefixedCaps, caps) => [
      ...unprefixedCaps,
      ..._(caps).keys().filter((cap) => !cap.includes(':') && !isStandardCap(cap)),
    ], [])
    .uniq()
    .value();
}

// Parse capabilities (based on https://www.w3.org/TR/webdriver/#processing-capabilities)
function parseCaps (caps, constraints = {}, shouldValidateCaps = true) {
  // If capabilities request is not an object, return error (#1.1)
  if (!_.isPlainObject(caps)) {
    throw new errors.InvalidArgumentError('The capabilities argument was not valid for the following reason(s): "capabilities" must be a JSON object.');
  }

  // Let 'requiredCaps' be property named 'alwaysMatch' from capabilities request (#2)
  // and 'allFirstMatchCaps' be property named 'firstMatch' from capabilities request (#3)
  let {
    alwaysMatch: requiredCaps = {}, // If 'requiredCaps' is undefined, set it to an empty JSON object (#2.1)
    firstMatch: allFirstMatchCaps = [{}], // If 'firstMatch' is undefined set it to a singleton list with one empty object (#3.1)
  } = caps;

  // Reject 'firstMatch' argument if it's not an array (#3.2)
  if (!_.isArray(allFirstMatchCaps)) {
    throw new errors.InvalidArgumentError('The capabilities.firstMatch argument was not valid for the following reason(s): "capabilities.firstMatch" must be a JSON array or undefined');
  }

  // If an empty array as provided, we'll be forgiving and make it an array of one empty object
  if (allFirstMatchCaps.length === 0) {
    allFirstMatchCaps.push({});
  }

  // Check for non-prefixed, non-standard capabilities and log warnings if they are found
  let nonPrefixedCaps = findNonPrefixedCaps(caps);
  if (!_.isEmpty(nonPrefixedCaps)) {
    log.warn(`The following capabilities are not standard capabilities and should have an extension prefix:`);
    for (const cap of nonPrefixedCaps) {
      log.warn(`  ${cap}`);
    }
  }

  // Strip out the 'appium:' prefix from all
  stripAppiumPrefixes(requiredCaps);
  for (let firstMatchCaps of allFirstMatchCaps) {
    stripAppiumPrefixes(firstMatchCaps);
  }

  // Validate the requiredCaps. But don't validate 'presence' because if that constraint fails on 'alwaysMatch' it could still pass on one of the 'firstMatch' keys
  if (shouldValidateCaps) {
    requiredCaps = validateCaps(requiredCaps, constraints, {skipPresenceConstraint: true});
  }


  // Remove the 'presence' constraint for any keys that are already present in 'requiredCaps'
  // since we know that this constraint has already passed
  let filteredConstraints = {...constraints};
  let requiredCapsKeys = _.keys(requiredCaps);
  for (let key of _.keys(filteredConstraints)) {
    if (requiredCapsKeys.includes(key)) {
      delete filteredConstraints[key];
    }
  }

  // Validate all of the first match capabilities and return an array with only the valid caps (see spec #5)
  let validationErrors = [];
  let validatedFirstMatchCaps = allFirstMatchCaps.map((firstMatchCaps) => {
    try {
      // Validate firstMatch caps
      return shouldValidateCaps ? validateCaps(firstMatchCaps, filteredConstraints) : firstMatchCaps;
    } catch (e) {
      validationErrors.push(e.message);
      return null;
    }
  }).filter((caps) => !_.isNull(caps));

  // Try to merge requiredCaps with first match capabilities, break once it finds its first match (see spec #6)
  let matchedCaps = null;
  for (let firstMatchCaps of validatedFirstMatchCaps) {
    try {
      matchedCaps = mergeCaps(requiredCaps, firstMatchCaps);
      if (matchedCaps) {
        break;
      }
    } catch (err) {
      log.warn(err.message);
    }
  }

  // Returns variables for testing purposes
  return {requiredCaps, allFirstMatchCaps, validatedFirstMatchCaps, matchedCaps, validationErrors};
}

// Calls parseCaps and just returns the matchedCaps variable
function processCapabilities (caps, constraints = {}, shouldValidateCaps = true) {
  const {matchedCaps, validationErrors} = parseCaps(caps, constraints, shouldValidateCaps);

  // If we found an error throw an exception
  if (!util.hasValue(matchedCaps)) {
    if (_.isArray(caps.firstMatch) && caps.firstMatch.length > 1) {
      // If there was more than one 'firstMatch' cap, indicate that we couldn't find a matching capabilities set and show all the errors
      throw new errors.InvalidArgumentError(`Could not find matching capabilities from ${JSON.stringify(caps)}:\n ${validationErrors.join('\n')}`);
    } else {
      // Otherwise, just show the singular error message
      throw new errors.InvalidArgumentError(validationErrors[0]);
    }
  }

  return matchedCaps;
}


export {
  parseCaps, processCapabilities, validateCaps, mergeCaps,
  findNonPrefixedCaps, isStandardCap
};

import _ from 'lodash';
import { validator } from './desired-caps';
import { util } from 'appium-support';

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

// Parse capabilities (based on https://www.w3.org/TR/webdriver/#processing-capabilities)
function parseCaps (caps, constraints = {}, shouldValidateCaps = true) {
  if (!_.isObject(caps)) {
    throw new Error('The capabilities argument was not valid for the following reason(s): "capabilities" must be a JSON object.');
  }

  let {alwaysMatch: requiredCaps, firstMatch: allFirstMatchCaps = []} = caps; // jshint ignore:line

  if (!_.isObject(requiredCaps)) {
    requiredCaps = {}; 
  }

  requiredCaps = validateCaps(requiredCaps, constraints);

  // Reject 'firstMatch' argument if it's not an array (see spec #3.2)
  if (!_.isArray(allFirstMatchCaps)) {
    throw new Error('The capabilities.firstMatch argument was not valid for the following reason(s): "capabilities.firstMatch" must be a JSON array or undefined');
  }

  // Validate all of the first match capabilities (see spec #5)
  let validatedFirstMatchCaps = allFirstMatchCaps.map((firstMatchCaps) => {
    try {
      return shouldValidateCaps ? validateCaps(firstMatchCaps, constraints) : firstMatchCaps;
    } catch (e) {
      throw new Error(`The capabilities.firstMatch argument was not valid for the following reason: ${firstMatchCaps} ${e.message}`);
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
function processCaps (caps, constraints = {}, shouldValidateCaps = true) {
  return parseCaps(caps, constraints, shouldValidateCaps).matchedCaps;
}


export default { parseCaps, processCaps, validateCaps, mergeCaps };

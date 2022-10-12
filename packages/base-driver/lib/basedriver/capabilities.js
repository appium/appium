// @ts-check

import _ from 'lodash';
import {validator} from './desired-caps';
import {util} from '@appium/support';
import log from './logger';
import {errors} from '../protocol/errors';

const APPIUM_VENDOR_PREFIX = 'appium:';
const APPIUM_OPTS_CAP = 'options';
const PREFIXED_APPIUM_OPTS_CAP = `${APPIUM_VENDOR_PREFIX}${APPIUM_OPTS_CAP}`;

/**
 * Takes primary caps object and merges it into a secondary caps object.
 * @template {Constraints} [T={}]
 * @template {Constraints} [U={}]
 * @param {Capabilities<T>} [primary]
 * @param {Capabilities<U>} [secondary]
 * @returns {import('type-fest').Merge<Capabilities<T>, Capabilities<U>>}
 * @see https://www.w3.org/TR/webdriver/#dfn-merging-capabilities)
 */
function mergeCaps(primary = {}, secondary = {}) {
  let result = /** @type {import('type-fest').Merge<Capabilities<T>, Capabilities<U>>} */ ({
    ...primary,
  });

  for (let [name, value] of /** @type {[keyof typeof secondary, any]} */ (_.toPairs(secondary))) {
    // Overwriting is not allowed. Primary and secondary must have different properties (w3c rule 4.4)
    if (!_.isUndefined(primary[name])) {
      throw new errors.InvalidArgumentError(
        `property '${name}' should not exist on both primary (${JSON.stringify(
          primary
        )}) and secondary (${JSON.stringify(secondary)}) object`
      );
    }
    result[/** @type {keyof typeof result} */ (name)] = value;
  }

  return result;
}

// Validates caps against a set of constraints
/**
 * @template {Constraints} [C={}]
 * @param {Capabilities<C>} caps
 * @param {C} [constraints]
 * @param {ValidateCapsOpts} [opts]
 * @returns {Capabilities<C>}
 */
function validateCaps(caps, constraints = /** @type {C} */ ({}), opts = {}) {
  let {skipPresenceConstraint} = opts;

  if (!_.isPlainObject(caps)) {
    throw new errors.InvalidArgumentError(`must be a JSON object`);
  }

  // Remove the 'presence' constraint if we're not checking for it
  constraints = /** @type {C} */ (
    _.mapValues(
      constraints,
      skipPresenceConstraint
        ? /** @param {Constraint} constraint */
          (constraint) => _.omit(constraint, 'presence')
        : /** @param {Constraint} constraint */
          (constraint) => {
            if (constraint.presence === true) {
              return {..._.omit(constraint, 'presence'), presence: {allowEmpty: false}};
            }
            return constraint;
          }
    )
  );

  const validationErrors = validator.validate(_.pickBy(caps, util.hasValue), constraints, {
    fullMessages: false,
  });

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

/**
 * Standard, non-prefixed capabilities
 * @see https://www.w3.org/TR/webdriver/#dfn-table-of-standard-capabilities)
 */
export const STANDARD_CAPS = Object.freeze(
  new Set(
    /** @type {import('type-fest').StringKeyOf<import('@appium/types').StandardCapabilities>[]} */ ([
      'browserName',
      'browserVersion',
      'platformName',
      'acceptInsecureCerts',
      'pageLoadStrategy',
      'proxy',
      'setWindowRect',
      'timeouts',
      'unhandledPromptBehavior',
    ])
  )
);

const STANDARD_CAPS_LOWER = new Set([...STANDARD_CAPS].map((cap) => cap.toLowerCase()));

/**
 * @param {string} cap
 * @returns {boolean}
 */
function isStandardCap(cap) {
  return STANDARD_CAPS_LOWER.has(cap.toLowerCase());
}

/**
 * If the 'appium:' prefix was provided and it's a valid capability, strip out the prefix
 * @template {Constraints} [C={}]
 * @param {import('@appium/types').NSCapabilities<C>} caps
 * @see https://www.w3.org/TR/webdriver/#dfn-extension-capabilities
 * @internal
 * @returns {import('@appium/types').Capabilities<C>}
 */
function stripAppiumPrefixes(caps) {
  // split into prefixed and non-prefixed.
  // non-prefixed should be standard caps at this point
  const [prefixedCaps, nonPrefixedCaps] = _.partition(_.keys(caps), (cap) =>
    String(cap).startsWith(APPIUM_VENDOR_PREFIX)
  );

  // initialize this with the k/v pairs of the non-prefixed caps
  let strippedCaps = /** @type {import('@appium/types').Capabilities<C>} */ (
    _.pick(caps, nonPrefixedCaps)
  );
  const badPrefixedCaps = [];

  // Strip out the 'appium:' prefix
  for (let prefixedCap of prefixedCaps) {
    const strippedCapName =
      /** @type {import('type-fest').StringKeyOf<import('@appium/types').Capabilities<C>>} */ (
        prefixedCap.substring(APPIUM_VENDOR_PREFIX.length)
      );

    // If it's standard capability that was prefixed, add it to an array of incorrectly prefixed capabilities
    if (isStandardCap(strippedCapName)) {
      badPrefixedCaps.push(strippedCapName);
      if (_.isNil(strippedCaps[strippedCapName])) {
        strippedCaps[strippedCapName] = caps[prefixedCap];
      } else {
        log.warn(
          `Ignoring capability '${prefixedCap}=${caps[prefixedCap]}' and ` +
            `using capability '${strippedCapName}=${strippedCaps[strippedCapName]}'`
        );
      }
    } else {
      strippedCaps[strippedCapName] = caps[prefixedCap];
    }
  }

  // If we found standard caps that were incorrectly prefixed, throw an exception (e.g.: don't accept 'appium:platformName', only accept just 'platformName')
  if (badPrefixedCaps.length > 0) {
    log.warn(
      `The capabilities ${JSON.stringify(
        badPrefixedCaps
      )} are standard capabilities and do not require "appium:" prefix`
    );
  }
  return strippedCaps;
}

/**
 * Get an array of all the unprefixed caps that are being used in 'alwaysMatch' and all of the 'firstMatch' object
 * @template {Constraints} [C={}]
 * @param {import('@appium/types').W3CCapabilities<C>} caps A capabilities object
 */
function findNonPrefixedCaps({alwaysMatch = {}, firstMatch = []}) {
  return _.chain([alwaysMatch, ...firstMatch])
    .reduce(
      (unprefixedCaps, caps) => [
        ...unprefixedCaps,
        ...Object.keys(caps).filter((cap) => !cap.includes(':') && !isStandardCap(cap)),
      ],
      []
    )
    .uniq()
    .value();
}

/**
 * Parse capabilities
 * @template {Constraints} [C={}]
 * @param {import('@appium/types').W3CCapabilities<C>} caps
 * @param {C} [constraints]
 * @param {boolean} [shouldValidateCaps]
 * @see https://www.w3.org/TR/webdriver/#processing-capabilities
 */
function parseCaps(caps, constraints = /** @type {C} */ ({}), shouldValidateCaps = true) {
  // If capabilities request is not an object, return error (#1.1)
  if (!_.isPlainObject(caps)) {
    throw new errors.InvalidArgumentError(
      'The capabilities argument was not valid for the following reason(s): "capabilities" must be a JSON object.'
    );
  }

  // Let 'requiredCaps' be property named 'alwaysMatch' from capabilities request (#2)
  // and 'allFirstMatchCaps' be property named 'firstMatch' from capabilities request (#3)
  let {
    alwaysMatch: requiredCaps = {}, // If 'requiredCaps' is undefined, set it to an empty JSON object (#2.1)
    firstMatch: allFirstMatchCaps = [{}], // If 'firstMatch' is undefined set it to a singleton list with one empty object (#3.1)
  } = caps;

  // Reject 'firstMatch' argument if it's not an array (#3.2)
  if (!_.isArray(allFirstMatchCaps)) {
    throw new errors.InvalidArgumentError(
      'The capabilities.firstMatch argument was not valid for the following reason(s): "capabilities.firstMatch" must be a JSON array or undefined'
    );
  }

  // If an empty array as provided, we'll be forgiving and make it an array of one empty object
  // In the future, reject 'firstMatch' argument if its array did not have one or more entries (#3.2)
  if (allFirstMatchCaps.length === 0) {
    log.warn(
      `The firstMatch array in the given capabilities has no entries. Adding an empty entry fo rnow, ` +
        `but it will require one or more entries as W3C spec.`
    );
    allFirstMatchCaps.push({});
  }

  // Check for non-prefixed, non-standard capabilities and log warnings if they are found
  let nonPrefixedCaps = findNonPrefixedCaps(caps);
  if (!_.isEmpty(nonPrefixedCaps)) {
    throw new errors.InvalidArgumentError(
      `All non-standard capabilities should have a vendor prefix. The following capabilities did not have one: ${nonPrefixedCaps}`
    );
  }

  // Strip out the 'appium:' prefix from all
  let strippedRequiredCaps = stripAppiumPrefixes(requiredCaps);
  let strippedAllFirstMatchCaps = allFirstMatchCaps.map(stripAppiumPrefixes);

  // Validate the requiredCaps. But don't validate 'presence' because if that constraint fails on 'alwaysMatch' it could still pass on one of the 'firstMatch' keys
  if (shouldValidateCaps) {
    strippedRequiredCaps = validateCaps(strippedRequiredCaps, constraints, {
      skipPresenceConstraint: true,
    });
  }
  // Remove the 'presence' constraint for any keys that are already present in 'requiredCaps'
  // since we know that this constraint has already passed
  const filteredConstraints = /** @type {C} */ (
    _.omitBy(constraints, (_, key) => key in strippedRequiredCaps)
  );

  // Validate all of the first match capabilities and return an array with only the valid caps (see spec #5)
  /** @type {string[]} */
  let validationErrors = [];
  let validatedFirstMatchCaps = _.compact(
    strippedAllFirstMatchCaps.map(
      /**
       * @param {import('@appium/types').Capabilities<C>} firstMatchCaps
       */
      (firstMatchCaps) => {
        try {
          // Validate firstMatch caps
          return shouldValidateCaps
            ? validateCaps(firstMatchCaps, filteredConstraints)
            : firstMatchCaps;
        } catch (e) {
          validationErrors.push(e.message);
        }
      }
    )
  );

  // Try to merge requiredCaps with first match capabilities, break once it finds its first match (see spec #6)
  let matchedCaps = null;
  for (let firstMatchCaps of validatedFirstMatchCaps) {
    try {
      matchedCaps = mergeCaps(strippedRequiredCaps, firstMatchCaps);
      if (matchedCaps) {
        break;
      }
    } catch (err) {
      log.warn(err.message);
      validationErrors.push(err.message);
    }
  }

  // Returns variables for testing purposes
  return {
    requiredCaps,
    allFirstMatchCaps,
    validatedFirstMatchCaps,
    matchedCaps,
    validationErrors,
  };
}

// Calls parseCaps and just returns the matchedCaps variable
/**
 * @template {Constraints} C
 * @param {import('@appium/types').W3CCapabilities<C>} w3cCaps
 * @param {C} [constraints]
 * @param {boolean} [shouldValidateCaps]
 * @returns {import('@appium/types').Capabilities<C>}
 */
function processCapabilities(
  w3cCaps,
  constraints = /** @type {C} */ ({}),
  shouldValidateCaps = true
) {
  const {matchedCaps, validationErrors} = parseCaps(w3cCaps, constraints, shouldValidateCaps);

  // If we found an error throw an exception
  if (!util.hasValue(matchedCaps)) {
    if (_.isArray(w3cCaps.firstMatch) && w3cCaps.firstMatch.length > 1) {
      // If there was more than one 'firstMatch' cap, indicate that we couldn't find a matching capabilities set and show all the errors
      throw new errors.InvalidArgumentError(
        `Could not find matching capabilities from ${JSON.stringify(
          w3cCaps
        )}:\n ${validationErrors.join('\n')}`
      );
    } else {
      // Otherwise, just show the singular error message
      throw new errors.InvalidArgumentError(validationErrors[0]);
    }
  }

  return /** @type {Capabilities<C>} */ (matchedCaps ?? {});
}

/**
 * Return a copy of a capabilities object which has taken everything within the 'options'
 * capability and promoted it to the top level. Note that this function is assumed to be run after
 * all vendor prefixes have already been stripped from the top level. So we are dealing with e.g.
 * 'options' and not 'appium:options' at this point. Any prefixes _inside_ the 'options' capability
 * will themselves be stripped. This is designed as an internal function, not one to operate on
 * user-constructed capabilities.
 *
 * @param {object} originalCaps - the capabilities to analyze and promote from 'options'
 * @return {object!} - the capabilities with 'options' promoted if necessary
 */
function promoteAppiumOptions(originalCaps) {
  const appiumOptions = originalCaps[APPIUM_OPTS_CAP];
  if (!appiumOptions) {
    return originalCaps;
  }

  let caps = _.cloneDeep(originalCaps);
  if (!_.isPlainObject(appiumOptions)) {
    throw new errors.SessionNotCreatedError(`The ${APPIUM_OPTS_CAP} capability must be an object`);
  }

  // first get rid of any prefixes inside appium:options
  const strippedAppiumOptions = stripAppiumPrefixes(appiumOptions);
  // warn if we are going to overwrite any keys on the base caps object
  const overwrittenKeys = _.intersection(Object.keys(caps), Object.keys(strippedAppiumOptions));
  if (overwrittenKeys.length > 0) {
    log.warn(
      `Found capabilities inside ${PREFIXED_APPIUM_OPTS_CAP} that will overwrite ` +
        `capabilities at the top level: ${JSON.stringify(overwrittenKeys)}`
    );
  }

  // now just apply them to the main caps object
  caps = {...caps, ...strippedAppiumOptions};

  // and remove all traces of the options cap
  delete caps[APPIUM_OPTS_CAP];
  return caps;
}

export {
  parseCaps,
  processCapabilities,
  validateCaps,
  mergeCaps,
  APPIUM_VENDOR_PREFIX,
  APPIUM_OPTS_CAP,
  findNonPrefixedCaps,
  isStandardCap,
  stripAppiumPrefixes,
  promoteAppiumOptions,
  PREFIXED_APPIUM_OPTS_CAP,
};

/**
 * @typedef {import('@appium/types').Constraints} Constraints
 * @typedef {import('@appium/types').Constraint} Constraint
 * @typedef {import('@appium/types').StringRecord} StringRecord
 * @typedef {import('@appium/types').BaseDriverCapConstraints} BaseDriverCapConstraints
 */

/**
 * @typedef ValidateCapsOpts
 * @property {boolean} [skipPresenceConstraint] - if true, skip the presence constraint
 */

/**
 * @template {Constraints} [C=BaseDriverCapConstraints]
 * @template {StringRecord|void} [Extra=void]
 * @typedef {import('@appium/types').NSCapabilities<C, Extra>} NSCapabilities
 */

/**
 * @template {Constraints} [C=BaseDriverCapConstraints]
 * @template {StringRecord|void} [Extra=void]
 * @typedef {import('@appium/types').Capabilities<C, Extra>} Capabilities
 */

/**
 * @template {Constraints} [C=BaseDriverCapConstraints]
 * @template {StringRecord|void} [Extra=void]
 * @typedef {import('@appium/types').W3CCapabilities<C, Extra>} W3CCapabilities
 */

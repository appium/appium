import type {
  Constraints,
  NSCapabilities,
  Capabilities,
  W3CCapabilities,
  StandardCapabilities,
} from '@appium/types';
import type {
  StringKeyOf,
  MergeExclusive,
} from 'type-fest';
import _ from 'lodash';
import {validator} from './desired-caps';
import {util} from '@appium/support';
import log from './logger';
import {errors} from '../protocol/errors';

export const APPIUM_VENDOR_PREFIX = 'appium:';
export const PREFIXED_APPIUM_OPTS_CAP = `${APPIUM_VENDOR_PREFIX}options`;

export type ParsedCaps<C extends Constraints> = {
  allFirstMatchCaps: NSCapabilities<C>[];
  validatedFirstMatchCaps: Capabilities<C>[];
  requiredCaps: NSCapabilities<C>;
  matchedCaps: Capabilities<C> | null;
  validationErrors: string[];
};
export type ValidateCapsOpts = {
  /** if true, skip the presence constraint */
  skipPresenceConstraint?: boolean | undefined;
}

/**
 * Takes primary caps object and merges it into a secondary caps object.
 *
 * @see https://www.w3.org/TR/webdriver/#dfn-merging-capabilities)
 */
export function mergeCaps<
  T extends Constraints,
  U extends Constraints,
  Primary extends Capabilities<T>,
  Secondary extends Capabilities<U>
>(
  primary: Primary | undefined = {} as Primary,
  secondary: Secondary | undefined = {} as Secondary
): MergeExclusive<Primary, Secondary> {
  const result = ({
    ...primary,
  }) as MergeExclusive<Primary, Secondary>;

  for (const [name, value] of Object.entries(secondary)) {
    // Overwriting is not allowed. Primary and secondary must have different properties (w3c rule 4.4)
    if (!_.isUndefined(primary[name])) {
      throw new errors.InvalidArgumentError(
        `property '${name}' should not exist on both primary (${JSON.stringify(
          primary
        )}) and secondary (${JSON.stringify(secondary)}) object`
      );
    }
    result[name as keyof typeof result] = value;
  }

  return result;
}

/**
 * Validates caps against a set of constraints
 */
export function validateCaps<C extends Constraints>(
  caps: Capabilities<C>,
  constraints: C | undefined = {} as C,
  opts: ValidateCapsOpts | undefined = {}
): Capabilities<C> {
  const {skipPresenceConstraint} = opts;

  if (!_.isPlainObject(caps)) {
    throw new errors.InvalidArgumentError(`must be a JSON object`);
  }

  // Remove the 'presence' constraint if we're not checking for it
  constraints = (
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
  ) as C;

  const validationErrors = validator.validate(_.pickBy(caps, util.hasValue), constraints, {
    fullMessages: false,
  });

  if (validationErrors) {
    const message: string[] = [];
    for (const [attribute, reasons] of _.toPairs(validationErrors)) {
      for (const reason of (reasons as string[])) {
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
    ([
      'browserName',
      'browserVersion',
      'platformName',
      'acceptInsecureCerts',
      'pageLoadStrategy',
      'proxy',
      'setWindowRect',
      'timeouts',
      'unhandledPromptBehavior',
      'webSocketUrl',
    ]) as StringKeyOf<StandardCapabilities>[]
  )
);

const STANDARD_CAPS_LOWER = new Set([...STANDARD_CAPS].map((cap) => cap.toLowerCase()));

export function isStandardCap(cap: string): boolean {
  return STANDARD_CAPS_LOWER.has(cap.toLowerCase());
}

/**
 * If the 'appium:' prefix was provided and it's a valid capability, strip out the prefix
 * @see https://www.w3.org/TR/webdriver/#dfn-extension-capabilities
 * @internal
 */
export function stripAppiumPrefixes<C extends Constraints>(caps: NSCapabilities<C>): Capabilities<C> {
  // split into prefixed and non-prefixed.
  // non-prefixed should be standard caps at this point
  const [prefixedCaps, nonPrefixedCaps] = _.partition(_.keys(caps), (cap) =>
    String(cap).startsWith(APPIUM_VENDOR_PREFIX)
  );

  // initialize this with the k/v pairs of the non-prefixed caps
  const strippedCaps = (_.pick(caps, nonPrefixedCaps)) as Capabilities<C>;
  const badPrefixedCaps: string[] = [];

  // Strip out the 'appium:' prefix
  for (const prefixedCap of prefixedCaps) {
    const strippedCapName = prefixedCap.substring(APPIUM_VENDOR_PREFIX.length) as StringKeyOf<Capabilities<C>>;

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
 */
export function findNonPrefixedCaps<C extends Constraints>(
  {
    alwaysMatch = {},
    firstMatch = []
  }: W3CCapabilities<C>
): string[] {
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
 * @see https://www.w3.org/TR/webdriver/#processing-capabilities
 */
export function parseCaps<C extends Constraints>(
  caps: W3CCapabilities<C>,
  constraints: C | undefined = {} as C,
  shouldValidateCaps: boolean | undefined = true
): ParsedCaps<C> {
  // If capabilities request is not an object, return error (#1.1)
  if (!_.isPlainObject(caps)) {
    throw new errors.InvalidArgumentError(
      'The capabilities argument was not valid for the following reason(s): "capabilities" must be a JSON object.'
    );
  }

  // Let 'requiredCaps' be property named 'alwaysMatch' from capabilities request (#2)
  // and 'allFirstMatchCaps' be property named 'firstMatch' from capabilities request (#3)
  const {
    alwaysMatch: requiredCaps = {} as NSCapabilities<C>, // If 'requiredCaps' is undefined, set it to an empty JSON object (#2.1)
    firstMatch: allFirstMatchCaps = [{}] as NSCapabilities<C>[], // If 'firstMatch' is undefined set it to a singleton list with one empty object (#3.1)
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
      `The firstMatch array in the given capabilities has no entries. Adding an empty entry for now, ` +
        `but it will require one or more entries as W3C spec.`
    );
    allFirstMatchCaps.push({});
  }

  // Check for non-prefixed, non-standard capabilities and log warnings if they are found
  const nonPrefixedCaps = findNonPrefixedCaps(caps);
  if (!_.isEmpty(nonPrefixedCaps)) {
    throw new errors.InvalidArgumentError(
      `All non-standard capabilities should have a vendor prefix. The following capabilities did not have one: ${nonPrefixedCaps}`
    );
  }

  // Strip out the 'appium:' prefix from all
  let strippedRequiredCaps = stripAppiumPrefixes(requiredCaps);
  const strippedAllFirstMatchCaps: Capabilities<C>[] = allFirstMatchCaps.map(stripAppiumPrefixes);

  // Validate the requiredCaps. But don't validate 'presence' because if that constraint fails on 'alwaysMatch' it could still pass on one of the 'firstMatch' keys
  if (shouldValidateCaps) {
    strippedRequiredCaps = validateCaps(strippedRequiredCaps, constraints, {
      skipPresenceConstraint: true,
    });
  }
  // Remove the 'presence' constraint for any keys that are already present in 'requiredCaps'
  // since we know that this constraint has already passed
  const filteredConstraints = _.omitBy(constraints, (_, key) => key in strippedRequiredCaps) as C;

  // Validate all of the first match capabilities and return an array with only the valid caps (see spec #5)
  const validationErrors: string[] = [];
  const validatedFirstMatchCaps = _.compact(
    strippedAllFirstMatchCaps.map((firstMatchCaps) => {
      try {
        // Validate firstMatch caps
        return shouldValidateCaps
          ? validateCaps(firstMatchCaps, filteredConstraints)
          : firstMatchCaps;
      } catch (e) {
        validationErrors.push(e.message);
      }
    })
  ) as Capabilities<C>[];

  /**
   * Try to merge requiredCaps with first match capabilities, break once it finds its first match
   * (see spec #6)
   */
  let matchedCaps: ParsedCaps<C>['matchedCaps'] = null;
  for (const firstMatchCaps of validatedFirstMatchCaps) {
    try {
      matchedCaps = mergeCaps(strippedRequiredCaps, firstMatchCaps) as ParsedCaps<C>['matchedCaps'];
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

/**
 * Calls parseCaps and just returns the matchedCaps variable
 */
export function processCapabilities<
  C extends Constraints,
  W3CCaps extends W3CCapabilities<C>
>(
  w3cCaps: W3CCaps,
  constraints: C | undefined = {} as C,
  shouldValidateCaps: boolean | undefined = true
): Capabilities<C> {
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

  return (matchedCaps ?? {}) as Capabilities<C>;
}

/**
 * Return a copy of a "bare" (single-level, non-W3C) capabilities object which has taken everything
 * within the 'appium:options' capability and promoted it to the top level.
 */
export function promoteAppiumOptionsForObject<C extends Constraints>(obj: NSCapabilities<C>): NSCapabilities<C> {
  const appiumOptions = obj[PREFIXED_APPIUM_OPTS_CAP];
  if (!appiumOptions) {
    return obj;
  }

  if (!_.isPlainObject(appiumOptions)) {
    throw new errors.SessionNotCreatedError(
      `The ${PREFIXED_APPIUM_OPTS_CAP} capability must be an object`
    );
  }
  if (_.isEmpty(appiumOptions)) {
    return obj;
  }

  log.debug(
    `Found ${PREFIXED_APPIUM_OPTS_CAP} capability present; will promote items inside to caps`
  );

  /**
   * @param {string} capName
   */
  const shouldAddVendorPrefix = (capName: string) => !capName.startsWith(APPIUM_VENDOR_PREFIX);
  const verifyIfAcceptable = (capName: string) => {
    if (!_.isString(capName)) {
      throw new errors.SessionNotCreatedError(
        `Capability names in ${PREFIXED_APPIUM_OPTS_CAP} must be strings. '${capName}' is unexpected`
      );
    }
    if (isStandardCap(capName)) {
      throw new errors.SessionNotCreatedError(
        `${PREFIXED_APPIUM_OPTS_CAP} must only contain vendor-specific capabilties. '${capName}' is unexpected`
      );
    }
    return capName;
  };
  const preprocessedOptions = _(appiumOptions)
    .mapKeys((value, key: string) => verifyIfAcceptable(key))
    .mapKeys((value, key: string) => (shouldAddVendorPrefix(key) ? `${APPIUM_VENDOR_PREFIX}${key}` : key))
    .value();
  // warn if we are going to overwrite any keys on the base caps object
  const overwrittenKeys = _.intersection(Object.keys(obj), Object.keys(preprocessedOptions));
  if (overwrittenKeys.length > 0) {
    log.warn(
      `Found capabilities inside ${PREFIXED_APPIUM_OPTS_CAP} that will overwrite ` +
        `capabilities at the top level: ${JSON.stringify(overwrittenKeys)}`
    );
  }
  return _.cloneDeep({
    ..._.omit(obj, PREFIXED_APPIUM_OPTS_CAP) as NSCapabilities<C>,
    ...preprocessedOptions,
  });
}

/**
 * Return a copy of a capabilities object which has taken everything within the 'options'
 * capability and promoted it to the top level.
 */
export function promoteAppiumOptions<C extends Constraints>(originalCaps: W3CCapabilities<C>): W3CCapabilities<C> {
  const result = {} as W3CCapabilities<C>;
  const {alwaysMatch, firstMatch} = originalCaps;
  if (_.isPlainObject(alwaysMatch)) {
    result.alwaysMatch = promoteAppiumOptionsForObject(alwaysMatch);
  } else if ('alwaysMatch' in originalCaps) {
    result.alwaysMatch = alwaysMatch;
  }
  if (_.isArray(firstMatch)) {
    result.firstMatch = firstMatch.map(promoteAppiumOptionsForObject);
  } else if ('firstMatch' in originalCaps) {
    result.firstMatch = firstMatch;
  }
  return result;
}

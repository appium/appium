import {util} from '@appium/support';
import type {
  Capabilities,
  Constraints,
  KeyAsString,
  MergeExclusive,
  NSCapabilities,
  StandardCapabilities,
  W3CCapabilities,
} from '@appium/types';

import {log} from '../helpers/logger.js';
import {errors} from '../protocol/errors.js';
import {omit, omitKeys, pickBy} from '../utils.js';
import {deserializeTimeouts} from './helpers/timeouts.js';
import {validator} from './validation.js';

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
  skipPresenceConstraint?: boolean;
};

/**
 * Takes primary caps object and merges it into a secondary caps object.
 *
 * @see https://www.w3.org/TR/webdriver/#dfn-merging-capabilities)
 */
export function mergeCaps<
  T extends Constraints,
  U extends Constraints,
  Primary extends Capabilities<T>,
  Secondary extends Capabilities<U>,
>(
  primary: Primary | undefined = {} as Primary,
  secondary: Secondary | undefined = {} as Secondary,
): MergeExclusive<Primary, Secondary> {
  const result = {
    ...primary,
  } as MergeExclusive<Primary, Secondary>;

  for (const [name, value] of Object.entries(secondary)) {
    // Overwriting is not allowed. Primary and secondary must have different properties (w3c rule 4.4)
    if (primary[name] !== undefined) {
      throw new errors.InvalidArgumentError(
        `property '${name}' should not exist on both primary (${JSON.stringify(
          primary,
        )}) and secondary (${JSON.stringify(secondary)}) object`,
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
  opts: ValidateCapsOpts | undefined = {},
): Capabilities<C> {
  const {skipPresenceConstraint} = opts;

  if (!util.isPlainObject(caps)) {
    throw new errors.InvalidArgumentError(`must be a JSON object`);
  }

  const normalizedCaps = omitNullCapabilities(caps);
  // Timeout objects in every candidate must be valid before capability matching.
  deserializeTimeouts(normalizedCaps.timeouts);

  // Remove the 'presence' constraint if we're not checking for it
  constraints = Object.fromEntries(
    Object.entries(constraints ?? {}).map(([key, constraint]) => {
      if (skipPresenceConstraint) {
        return [key, omit(constraint as Record<string, unknown>, 'presence')];
      }
      if ((constraint as {presence?: unknown}).presence === true) {
        return [
          key,
          {
            ...omit(constraint as Record<string, unknown>, 'presence'),
            presence: {allowEmpty: false},
          },
        ];
      }
      return [key, constraint];
    }),
  ) as C;

  const validationErrors = validator.validate(
    pickBy(normalizedCaps, (value) => util.hasValue(value)),
    constraints,
  );

  if (validationErrors) {
    const message: string[] = [];
    for (const [attribute, reasons] of Object.entries(validationErrors)) {
      for (const reason of reasons as string[]) {
        message.push(`'${attribute}' ${reason}`);
      }
    }
    throw new errors.InvalidArgumentError(message.join('; '));
  }

  // Return caps
  return normalizedCaps;
}

/**
 * Standard, non-prefixed capabilities
 * @see https://www.w3.org/TR/webdriver2/#dfn-table-of-standard-capabilities)
 */
export const STANDARD_CAPS = Object.freeze(
  new Set([
    'browserName',
    'browserVersion',
    'platformName',
    'acceptInsecureCerts',
    'pageLoadStrategy',
    'proxy',
    'setWindowRect',
    'timeouts',
    'strictFileInteractability',
    'unhandledPromptBehavior',
    'userAgent',
    'webSocketUrl',
  ] as KeyAsString<StandardCapabilities>[]),
);

/**
 * @param cap - Capability name
 * @returns Whether the name exactly matches a W3C standard capability
 */
export function isStandardCap(cap: string): boolean {
  return STANDARD_CAPS.has(cap as KeyAsString<StandardCapabilities>);
}

/**
 * If the 'appium:' prefix was provided and it's a valid capability, strip out the prefix
 * @see https://www.w3.org/TR/webdriver/#dfn-extension-capabilities
 * @internal
 */
export function stripAppiumPrefixes<C extends Constraints>(caps: NSCapabilities<C>): Capabilities<C> {
  // split into prefixed and non-prefixed.
  // non-prefixed should be standard caps at this point
  const capKeys = Object.keys(caps);
  const prefixedCaps = capKeys.filter((cap) => String(cap).startsWith(APPIUM_VENDOR_PREFIX));
  const nonPrefixedCaps = capKeys.filter((cap) => !String(cap).startsWith(APPIUM_VENDOR_PREFIX));

  // initialize this with the k/v pairs of the non-prefixed caps
  const strippedCaps: Record<string, unknown> = Object.fromEntries(
    nonPrefixedCaps.map((cap) => [cap, caps[cap as keyof typeof caps]]),
  ) as Capabilities<C>;
  const badPrefixedCaps: string[] = [];

  // Strip out the 'appium:' prefix
  for (const prefixedCap of prefixedCaps) {
    const strippedCapName = prefixedCap.substring(APPIUM_VENDOR_PREFIX.length) as KeyAsString<Capabilities<C>>;

    // If it's standard capability that was prefixed, add it to an array of incorrectly prefixed capabilities
    if (isStandardCap(strippedCapName)) {
      badPrefixedCaps.push(strippedCapName);
      if (strippedCaps[strippedCapName] == null) {
        strippedCaps[strippedCapName] = caps[prefixedCap as keyof typeof caps];
      } else {
        log.warn(
          `Ignoring capability '${prefixedCap}=${JSON.stringify(caps[prefixedCap as keyof typeof caps])}' and ` +
            `using capability '${strippedCapName}=${JSON.stringify(strippedCaps[strippedCapName])}'`,
        );
      }
    } else {
      strippedCaps[strippedCapName] = caps[prefixedCap as keyof typeof caps];
    }
  }

  // If we found standard caps that were incorrectly prefixed, throw an exception (e.g.: don't accept 'appium:platformName', only accept just 'platformName')
  if (badPrefixedCaps.length > 0) {
    log.warn(
      `The capabilities ${JSON.stringify(
        badPrefixedCaps,
      )} are standard capabilities and do not require "appium:" prefix`,
    );
  }
  return strippedCaps as Capabilities<C>;
}

/**
 * Get an array of all the unprefixed caps that are being used in 'alwaysMatch' and all of the 'firstMatch' object
 */
export function findNonPrefixedCaps<C extends Constraints>({
  alwaysMatch = {},
  firstMatch = [],
}: W3CCapabilities<C>): string[] {
  return util.uniq(
    [alwaysMatch, ...firstMatch].reduce<string[]>(
      (unprefixedCaps, caps) => [
        ...unprefixedCaps,
        ...Object.keys(caps).filter((cap) => !cap.includes(':') && !isStandardCap(cap)),
      ],
      [],
    ),
  );
}

/**
 * Parse capabilities
 * @see https://www.w3.org/TR/webdriver/#processing-capabilities
 */
export function parseCaps<C extends Constraints>(
  unparsedCaps: W3CCapabilities<C>,
  constraints: C | undefined = {} as C,
  shouldValidateCaps: boolean | undefined = true,
): ParsedCaps<C> {
  return new CapabilityParser(constraints, shouldValidateCaps).parse(unparsedCaps);
}

/**
 * Calls parseCaps and just returns the matchedCaps variable
 */
export function processCapabilities<C extends Constraints, W3CCaps extends W3CCapabilities<C>>(
  w3cCaps: W3CCaps,
  constraints: C | undefined = {} as C,
  shouldValidateCaps: boolean | undefined = true,
): Capabilities<C> {
  const {matchedCaps, validationErrors} = parseCaps(w3cCaps, constraints, shouldValidateCaps);

  // If we found an error throw an exception
  if (!util.hasValue(matchedCaps)) {
    if (Array.isArray(w3cCaps.firstMatch) && w3cCaps.firstMatch.length > 1) {
      // If there was more than one 'firstMatch' cap, indicate that we couldn't find a matching capabilities set and show all the errors
      throw new errors.InvalidArgumentError(
        `Could not find matching capabilities from ${JSON.stringify(w3cCaps)}:\n ${validationErrors.join('\n')}`,
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

  if (!util.isPlainObject(appiumOptions)) {
    throw new errors.SessionNotCreatedError(`The ${PREFIXED_APPIUM_OPTS_CAP} capability must be an object`);
  }
  if (util.isEmpty(appiumOptions)) {
    return obj;
  }

  log.debug(`Found ${PREFIXED_APPIUM_OPTS_CAP} capability present; will promote items inside to caps`);

  /**
   * @param {string} capName
   */
  const shouldAddVendorPrefix = (capName: string) => !capName.startsWith(APPIUM_VENDOR_PREFIX);
  const verifyIfAcceptable = (capName: string) => {
    if (typeof capName !== 'string') {
      throw new errors.SessionNotCreatedError(
        `Capability names in ${PREFIXED_APPIUM_OPTS_CAP} must be strings. '${String(capName)}' is unexpected`,
      );
    }
    if (isStandardCap(capName)) {
      throw new errors.SessionNotCreatedError(
        `${PREFIXED_APPIUM_OPTS_CAP} must only contain vendor-specific capabilities. '${capName}' is unexpected`,
      );
    }
    return capName;
  };
  const preprocessedOptions: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(appiumOptions as Record<string, unknown>)) {
    const verifiedKey = verifyIfAcceptable(key);
    const finalKey = shouldAddVendorPrefix(verifiedKey) ? `${APPIUM_VENDOR_PREFIX}${verifiedKey}` : verifiedKey;
    preprocessedOptions[finalKey] = value;
  }
  // warn if we are going to overwrite any keys on the base caps object
  const overwrittenKeys = Object.keys(obj).filter((key) => key in preprocessedOptions);
  if (overwrittenKeys.length > 0) {
    log.warn(
      `Found capabilities inside ${PREFIXED_APPIUM_OPTS_CAP} that will overwrite ` +
        `capabilities at the top level: ${JSON.stringify(overwrittenKeys)}`,
    );
  }
  const restObj = omit(obj, PREFIXED_APPIUM_OPTS_CAP) as NSCapabilities<C>;
  return structuredClone({
    ...restObj,
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
  if (util.isPlainObject(alwaysMatch)) {
    result.alwaysMatch = promoteAppiumOptionsForObject(alwaysMatch);
  } else if ('alwaysMatch' in originalCaps) {
    result.alwaysMatch = alwaysMatch;
  }
  if (Array.isArray(firstMatch)) {
    result.firstMatch = firstMatch.map(promoteAppiumOptionsForObject);
  } else if ('firstMatch' in originalCaps) {
    result.firstMatch = firstMatch;
  }
  return result;
}

/** Encapsulates capability validation and matching without changing the input request. */
class CapabilityParser<C extends Constraints> {
  constructor(
    private readonly constraints: C,
    private readonly shouldValidateCaps: boolean,
  ) {}

  /** Validate and merge all candidates before selecting the first match. */
  public parse(unparsedCaps: W3CCapabilities<C>): ParsedCaps<C> {
    const {requiredCaps, allFirstMatchCaps} = this.readRequest(unparsedCaps);
    const {required, candidates} = this.normalizeCapabilities(requiredCaps, allFirstMatchCaps);
    const validatedRequired = this.validateValues(required, candidates);

    // Merge every candidate before matching. A duplicate in any candidate invalidates the request.
    const mergedCaps = candidates.map((candidate) => mergeCaps(validatedRequired, candidate));
    return {
      requiredCaps,
      allFirstMatchCaps,
      ...this.matchCandidates(candidates, mergedCaps),
    };
  }

  private readRequest(unparsedCaps: W3CCapabilities<C>) {
    if (!util.isPlainObject(unparsedCaps)) {
      throw new errors.InvalidArgumentError(
        'The capabilities argument was not valid for the following reason(s): "capabilities" must be a JSON object.',
      );
    }

    const {
      alwaysMatch: requiredCaps = {} as NSCapabilities<C>,
      firstMatch: allFirstMatchCaps = [{}] as NSCapabilities<C>[],
    } = unparsedCaps as W3CCapabilities<C>;
    if (!Array.isArray(allFirstMatchCaps) || allFirstMatchCaps.length === 0) {
      throw new errors.InvalidArgumentError(
        'The capabilities.firstMatch argument was not valid for the following reason(s): "capabilities.firstMatch" must be a non-empty JSON array or undefined',
      );
    }
    return {requiredCaps, allFirstMatchCaps};
  }

  private normalizeCapabilities(requiredCaps: NSCapabilities<C>, allFirstMatchCaps: NSCapabilities<C>[]) {
    const required = omitNullCapabilities(requiredCaps);
    const candidates = allFirstMatchCaps.map(omitNullCapabilities);
    const nonPrefixedCaps = findNonPrefixedCaps({alwaysMatch: required, firstMatch: candidates});
    if (!util.isEmpty(nonPrefixedCaps)) {
      throw new errors.InvalidArgumentError(
        `All non-standard capabilities should have a vendor prefix. The following capabilities did not have one: ${nonPrefixedCaps.join(', ')}`,
      );
    }
    return {
      required: stripAppiumPrefixes(required),
      candidates: candidates.map(stripAppiumPrefixes),
    };
  }

  private validateValues(required: Capabilities<C>, candidates: Capabilities<C>[]): Capabilities<C> {
    if (!this.shouldValidateCaps) {
      return required;
    }

    // A well-formed platform name may be unsupported by this driver. Check platform
    // inclusion during matching, while retaining its type checks during validation.
    const validationConstraints = {
      ...this.constraints,
      ...(this.constraints?.platformName && {
        platformName: omitKeys({...this.constraints.platformName}, ['inclusion', 'inclusionCaseInsensitive']),
      }),
    } as C;
    const options = {skipPresenceConstraint: true};
    const validatedRequired = validateCaps(required, validationConstraints, options);
    // Validate every candidate before merging or matching (spec #5).
    // Required driver capabilities may come from either alwaysMatch or firstMatch.
    for (const candidate of candidates) {
      validateCaps(candidate, validationConstraints, options);
    }
    return validatedRequired;
  }

  private matchCandidates(
    candidates: Capabilities<C>[],
    mergedCaps: Capabilities<C>[],
  ): Pick<ParsedCaps<C>, 'validatedFirstMatchCaps' | 'matchedCaps' | 'validationErrors'> {
    const validationErrors: string[] = [];
    const validatedFirstMatchCaps: Capabilities<C>[] = [];
    let matchedCaps: Capabilities<C> | null = null;
    for (const [index, candidate] of candidates.entries()) {
      try {
        // Check platform support and required driver capabilities on the merged candidate.
        if (this.shouldValidateCaps) {
          validateCaps(mergedCaps[index], this.constraints);
        }
        matchedCaps ??= mergedCaps[index];
        validatedFirstMatchCaps.push(candidate);
      } catch (e) {
        validationErrors.push((e as Error).message);
      }
    }
    return {validatedFirstMatchCaps, matchedCaps, validationErrors};
  }
}

/** Omit only top-level null values; nested values belong to capability-specific deserializers. */
function omitNullCapabilities<T extends Record<string, unknown>>(caps: T): T {
  return util.isPlainObject(caps) ? (pickBy(caps, (value) => value !== null) as T) : caps;
}

import {util} from '@appium/support';
import type {PayloadParams} from '@appium/types';
import type {MultidimensionalReadonlyArray} from 'type-fest';

import {PROTOCOLS} from '../constants.js';
import {log} from '../helpers/logger.js';
import {omitKeys} from '../utils.js';
import {BadParametersError, errors} from './errors.js';

/**
 * Validate request arguments against a route payload spec and return filtered params.
 * @param paramSpec - Required/optional parameter definition from the method map
 * @param args - Raw arguments (e.g. JSON body)
 * @param protocol - Active protocol, used when a custom validate function is present
 */
export function checkParams(
  paramSpec: PayloadParams,
  args: Record<string, any>,
  protocol?: keyof typeof PROTOCOLS,
): Record<string, any> {
  let requiredParams: string[][] = [];
  let optionalParams: string[] = [];
  const actualParamNames: string[] = Object.keys(args);

  if (paramSpec.required) {
    // we might have an array of parameters,
    // or an array of arrays of parameters, so standardize
    requiredParams = structuredClone(
      (hasMultipleRequiredParamSets(paramSpec.required) ? paramSpec.required : [paramSpec.required]) as string[][],
    );
  }
  // optional parameters are just an array
  if (paramSpec.optional) {
    optionalParams = structuredClone(paramSpec.optional as string[]);
  }

  // If a function was provided as the 'validate' key, it will here be called with
  // args as the param. If it returns something falsy, verification will be
  // considered to have passed. If it returns something else, that will be the
  // argument to an error which is thrown to the user
  if (paramSpec.validate) {
    const message = paramSpec.validate(args, protocol ?? PROTOCOLS.W3C);
    if (message) {
      throw new errors.InvalidArgumentError(typeof message === 'string' ? message : undefined);
    }
  }

  // some clients pass in the session id in the params
  if (!optionalParams.includes('sessionId')) {
    optionalParams.push('sessionId');
  }
  // some clients pass in an element id in the params
  if (!optionalParams.includes('id')) {
    optionalParams.push('id');
  }

  if (util.isEmpty(requiredParams)) {
    // if we don't have any required parameters, then just filter out unknown ones
    return pickKnownParams(
      args,
      actualParamNames.filter((name) => !optionalParams.includes(name)),
    );
  }

  // go through the required parameters and check against our arguments
  let matchedReqParamSet: string[] = [];
  for (const requiredParamsSet of requiredParams) {
    if (!Array.isArray(requiredParamsSet)) {
      throw new Error(
        `The required parameter set item ${JSON.stringify(requiredParamsSet)} ` +
          `in ${JSON.stringify(paramSpec)} is not an array. ` +
          `This is a bug in the method map definition.`,
      );
    }
    if (requiredParamsSet.every((name) => actualParamNames.includes(name))) {
      return pickKnownParams(
        args,
        actualParamNames.filter((name) => !requiredParamsSet.includes(name) && !optionalParams.includes(name)),
      );
    }
    if (!util.isEmpty(requiredParamsSet) && util.isEmpty(matchedReqParamSet)) {
      matchedReqParamSet = requiredParamsSet;
    }
  }
  throw new BadParametersError(
    {
      ...paramSpec,
      required: matchedReqParamSet,
      optional: optionalParams,
    },
    actualParamNames,
  );
}

/**
 * Build the ordered argument list for a driver command from URL params, JSON body, and route spec.
 * @param requestParams - Express route parameters (e.g. sessionId, element id)
 * @param jsonObj - Parsed JSON request body
 * @param payloadParams - Route payload definition (required/optional/makeArgs)
 */
export function makeArgs(
  requestParams: Record<string, string | string[] | undefined>,
  jsonObj: any,
  payloadParams: PayloadParams,
): any[] {
  // We want to pass the "url" parameters to the commands in reverse order
  // since the command will sometimes want to ignore, say, the sessionId.
  // This has the effect of putting sessionId last, which means in JS we can
  // omit it from the function signature if we're not going to use it.
  const urlParams = Object.keys(requestParams).reverse();

  // In the simple case, the required parameters are a basic array in
  // payloadParams.required, so start there. It's possible that there are
  // multiple optional sets of required params, though, so handle that case
  // too.
  let requiredParams = payloadParams.required;
  if (hasMultipleRequiredParamSets(payloadParams.required)) {
    // If there are optional sets of required params, then we will have an
    // array of arrays in payloadParams.required, so loop through each set and
    // pick the one that matches which JSON params were actually sent. We've
    // already been through validation so we're guaranteed to find a match.
    const keys = Object.keys(jsonObj);
    for (const params of payloadParams.required) {
      if (params.filter((p) => !keys.includes(p)).length === 0) {
        requiredParams = params;
        break;
      }
    }
  }

  // Now we construct our list of arguments which will be passed to the command
  let args;
  if (typeof payloadParams.makeArgs === 'function') {
    // In the route spec, a particular route might define a 'makeArgs' function
    // if it wants full control over how to turn JSON parameters into command
    // arguments. So we pass it the JSON parameters and it returns an array
    // which will be applied to the handling command. For example if it returns
    // [1, 2, 3], we will call `command(1, 2, 3, ...)` (url params are separate
    // from JSON params and get concatenated below).
    args = payloadParams.makeArgs(jsonObj);
  } else {
    // Otherwise, collect all the required and optional params and flatten them
    // into an argument array
    args = (requiredParams ?? []).flat().map((p) => jsonObj[p]);
    if (payloadParams.optional) {
      args = args.concat((payloadParams.optional ?? []).flat().map((p) => jsonObj[p]));
    }
  }
  // Finally, get our url params (session id, element id, etc...) on the end of
  // the list
  args = args.concat(urlParams.map((u) => requestParams[u]));
  return args;
}

/**
 * Validate parameters for execute/executeAsync script endpoints.
 * @param params - Raw execute command arguments from the client
 * @param paramSpec - Optional payload spec for additional validation
 */
export function validateExecuteMethodParams(params: any[], paramSpec?: PayloadParams): any[] {
  // the w3c protocol will give us an array of arguments to apply to a javascript function.
  // that's not what we're doing. we're going to look for a JS object as the first arg, so we
  // can perform validation on it. we'll ignore everything else.
  if (!params || !Array.isArray(params) || params.length > 1) {
    throw new errors.InvalidArgumentError(
      `Did not get correct format of arguments for execute method. Expected zero or one ` +
        `arguments to execute script and instead received: ${JSON.stringify(params)}`,
    );
  }
  const args: Record<string, any> = params[0] ?? {};
  if (!util.isPlainObject(args)) {
    throw new errors.InvalidArgumentError(
      `Did not receive an appropriate execute method parameters object. It needs to be ` +
        `deserializable as a plain JS object`,
    );
  }
  const specToUse = {
    ...(paramSpec ?? {}),
    required: paramSpec?.required ?? [],
    optional: paramSpec?.optional ?? [],
  };
  const filteredArgs = checkParams(specToUse, args);
  return makeArgs({}, filteredArgs, specToUse);
}

/**
 * There are commands like performTouch which take a single parameter (primitive type or array).
 * Some drivers choose to pass this parameter as a value (eg. [action1, action2...]) while others to
 * wrap it within an object(eg' {gesture:  [action1, action2...]}), which makes it hard to validate.
 * The wrap option in the spec enforce wrapping before validation, so that all params are wrapped at
 * the time they are validated and later passed to the commands.
 * @param paramSets - Payload spec, used for its `wrap` key
 * @param jsonObj - Parsed JSON request body
 */
export function wrapParams<T>(paramSets: PayloadParams, jsonObj: T): T | Record<string, T> {
  return (Array.isArray(jsonObj) || typeof jsonObj !== 'object' || jsonObj === null) && paramSets.wrap
    ? {[paramSets.wrap]: jsonObj}
    : jsonObj;
}

/**
 * There are commands like setCookie which send parameters wrapped inside a key such as
 * "parameters". This function unwraps them (eg. {"parameters": {"type": 1}} becomes {"type": 1}).
 * @param paramSets - Payload spec, used for its `unwrap` key
 * @param jsonObj - Parsed JSON request body
 */
export function unwrapParams<T>(paramSets: PayloadParams, jsonObj: T): T | Record<string, T> {
  const unwrapped =
    typeof jsonObj === 'object' && jsonObj !== null && paramSets.unwrap
      ? (jsonObj as Record<string, T>)[paramSets.unwrap]
      : undefined;
  return unwrapped !== undefined ? unwrapped : jsonObj;
}

function hasMultipleRequiredParamSets(
  required: ReadonlyArray<string> | MultidimensionalReadonlyArray<string, 2> | undefined,
): required is MultidimensionalReadonlyArray<string, 2> {
  return Boolean(required && Array.isArray(required?.[0]));
}

function pickKnownParams(args: Record<string, any>, unknownNames: string[]): Record<string, any> {
  if (util.isEmpty(unknownNames)) {
    return args;
  }
  log.info(`The following arguments are not known and will be ignored: ${unknownNames}`);
  return omitKeys(args, unknownNames);
}

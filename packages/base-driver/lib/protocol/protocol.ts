import { logger, util } from '@appium/support';
import type { AppiumLogger, Core, Driver, DriverMethodDef, MethodMap, PayloadParams } from '@appium/types';
import type { Application, Request, Response } from 'express';
import type { MultidimensionalReadonlyArray } from 'type-fest';
import type { BaseDriver } from '../basedriver/driver';
import { generateDriverLogPrefix } from '../basedriver/helpers';
import { log } from '../basedriver/logger';
import { DEFAULT_BASE_PATH, MAX_LOG_BODY_LENGTH, PROTOCOLS } from '../constants';
import type { RouteConfiguringFunction } from '../express/server';
import { isW3cCaps } from '../helpers/capabilities';
import { omitKeys } from '../utils';
import {
  BadParametersError,
  errorFromMJSONWPStatusCode,
  errorFromW3CJsonCode,
  errors,
  getResponseForW3CError,
  isErrorType,
} from './errors';
import { ensureW3cResponse, formatResponseValue } from './helpers';
import { METHOD_MAP, NO_SESSION_ID_COMMANDS } from './routes';
import { validators } from './validators';

export const CREATE_SESSION_COMMAND = 'createSession';
export const DELETE_SESSION_COMMAND = 'deleteSession';
export const GET_STATUS_COMMAND = 'getStatus';
export const LIST_DRIVER_COMMANDS_COMMAND = 'listCommands';
export const LIST_DRIVER_EXTENSIONS_COMMAND = 'listExtensions';

export const deprecatedCommandsLogged: Set<string> = new Set();

/**
 * Infer W3C vs MJSONWP from new-session capability payloads.
 * @param createSessionArgs - Arguments passed to the createSession command
 */
export function determineProtocol(createSessionArgs: any[]): keyof typeof PROTOCOLS {
  return createSessionArgs.some(isW3cCaps) ? PROTOCOLS.W3C : PROTOCOLS.MJSONWP;
}

/**
 * Extract and validate the sessionId from the Express route parameter.
 * Express may return route params as string | string[] | undefined.
 * Appium uses standard routes (e.g., /session/:sessionId) which should always be strings.
 * Only `*` such as `/session/*sessionId` can return `string[]`.
 * Then, this method will return the first element as the session id.
 * It may break existing appium routing handling also, thus this method will log
 * received parameters as well to help debugging.
 * @param driver Running driver
 * @param req The request in Express
 * @returns The normalized sessionId (string or undefined)
 */
export function getSessionId(driver: Core<any>, req: Request): string | undefined {
  if (Array.isArray(req.params.sessionId)) {
    const sessionId = req.params.sessionId[0];
    getLogger(driver, sessionId).warn(
      `Received malformed sessionId as array from the route: ${req.originalUrl}. ` +
        `This indicates the route definition issue. The route should start with '/session/:sessionId' (named parameter) ` +
        `instead of '/session/*sessionId' (wildcard). ` +
        `Using the first element as session id: ${sessionId}. ` +
        `Please fix the route definition to prevent this error.`,
    );
    // This is to not log the message multiple times.
    req.params.sessionId = sessionId;
    return sessionId;
  }
  return req.params.sessionId;
}

/**
 * @param command - Driver command name
 * @returns Whether the command requires a session id in the URL
 */
export function isSessionCommand(command: string): boolean {
  return !NO_SESSION_ID_COMMANDS.includes(command);
}

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
 * Returns a function that registers default (and plugin) HTTP routes on an Express app for a driver.
 * @param driver - Driver instance used to execute commands
 */
export function routeConfiguringFunction(driver: Core<any>): RouteConfiguringFunction {
  if (!driver.sessionExists) {
    throw new Error('Drivers must implement `sessionExists` property');
  }

  if (!((driver as any).executeCommand || (driver as any).execute)) {
    throw new Error('Drivers must implement `executeCommand` or `execute` method');
  }

  // return a function which will add all the routes to the driver. Here extraMethods might be
  // passed in as defined by Appium plugins, so we need to add those to the default list
  return function addRoutes(app, { basePath = DEFAULT_BASE_PATH, extraMethodMap = {} } = {}) {
    // store basePath on the driver instance so it can use it if necessary
    // for example in determining proxy avoidance
    driver.basePath = basePath;

    const allMethods: MethodMap<Driver> = { ...METHOD_MAP, ...extraMethodMap };
    for (const [path, methods] of Object.entries(allMethods)) {
      for (const [method, spec] of Object.entries(methods)) {
        const isSessCommand = spec.command ? isSessionCommand(spec.command) : false;
        // set up the express route handler
        buildHandler(app, method, `${basePath}${path}`, spec, driver, isSessCommand);
      }
    }
  };
}

/**
 * Whether an incoming request should be forwarded to the driver's JWProxy for the given command.
 * @param driver - Active driver
 * @param req - Incoming HTTP request
 * @param command - Resolved driver command name
 */
export function driverShouldDoJwpProxy(driver: Core<any>, req: Request, command: string): boolean {
  const sessionId = getSessionId(driver, req);
  // drivers need to explicitly say when the proxy is active
  if (!driver.proxyActive(sessionId)) {
    return false;
  }

  // we should never proxy deleteSession because we need to give the containing
  // driver an opportunity to clean itself up
  if (command === DELETE_SESSION_COMMAND) {
    return false;
  }

  // validate avoidance schema, and say we shouldn't proxy if anything in the
  // avoid list matches our req
  if (driver.proxyRouteIsAvoided(sessionId as string, req.method, req.originalUrl, req.body)) {
    return false;
  }

  return true;
}

function extractProtocol(driver: Core<any>, sessionId: string | null = null): keyof typeof PROTOCOLS {
  const dstDriver =
    typeof driver.driverForSession === 'function' && sessionId ? driver.driverForSession(sessionId) : driver;
  if (dstDriver === driver) {
    // Shortcircuit if the driver instance is not an umbrella driver
    // or it is Fake driver instance, where `driver.driverForSession`
    // always returns self instance
    return driver.protocol ?? PROTOCOLS.W3C;
  }

  // Extract the protocol for the current session if the given driver is the umbrella one
  return dstDriver?.protocol ?? PROTOCOLS.W3C;
}

function getLogger(driver: Core<any>, sessionId: string | null = null): AppiumLogger {
  const dstDriver =
    sessionId && typeof driver.driverForSession === 'function'
      ? (driver.driverForSession(sessionId) ?? driver)
      : driver;
  if (typeof dstDriver.log?.info === 'function') {
    return dstDriver.log;
  }

  const logPrefix = generateDriverLogPrefix(dstDriver);
  return logger.getLogger(logPrefix);
}

function wrapParams<T>(paramSets: PayloadParams, jsonObj: T): T | Record<string, T> {
  /* There are commands like performTouch which take a single parameter (primitive type or array).
   * Some drivers choose to pass this parameter as a value (eg. [action1, action2...]) while others to
   * wrap it within an object(eg' {gesture:  [action1, action2...]}), which makes it hard to validate.
   * The wrap option in the spec enforce wrapping before validation, so that all params are wrapped at
   * the time they are validated and later passed to the commands.
   */
  return (Array.isArray(jsonObj) || typeof jsonObj !== 'object' || jsonObj === null) && paramSets.wrap
    ? { [paramSets.wrap]: jsonObj }
    : jsonObj;
}

function unwrapParams<T>(paramSets: PayloadParams, jsonObj: T): T | Record<string, T> {
  /* There are commands like setNetworkConnection which send parameters wrapped inside a key such as
   * "parameters". This function unwraps them (eg. {"parameters": {"type": 1}} becomes {"type": 1}).
   */
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

function buildHandler(
  app: Application,
  method: string,
  path: string,
  spec: DriverMethodDef<Driver>,
  driver: Core<any>,
  isSessCmd: boolean,
): void {
  const asyncHandler = async (req: Request, res: Response) => {
    let jsonObj = req.body;
    let httpResBody = {} as any;
    let httpStatus = 200;
    let newSessionId: string | undefined;
    const sessionId = getSessionId(driver, req);
    let currentProtocol = extractProtocol(driver, sessionId);

    try {
      // if the route accessed is deprecated, log a warning
      if (spec.deprecated && spec.command && !deprecatedCommandsLogged.has(spec.command)) {
        deprecatedCommandsLogged.add(spec.command);
        getLogger(driver, sessionId).warn(
          `The ${method} ${path} endpoint has been deprecated and will be removed in a future ` +
            `version of Appium or your driver/plugin. Please use a different endpoint or contact the ` +
            `driver/plugin author to add explicit support for the endpoint before it is removed`,
        );
      }

      // if this is a session command but we don't have a session,
      // error out early (especially before proxying)
      if (isSessCmd && !driver.sessionExists(sessionId)) {
        throw new errors.NoSuchDriverError();
      }

      // if the driver is currently proxying commands to another JSONWP server, bypass all our
      // checks and assume the upstream server knows what it's doing. But keep this in the
      // try/catch block so if proxying itself fails, we give a message to the client. Of course we
      // only want to do these when we have a session command; the Appium driver must be
      // responsible for start/stop session, etc... We also allow the command spec to declare that
      // this command should never be proxied (which is useful for plugin developers who add
      // commands and generally would not want that command to be proxied instead of handled by the
      // plugin)
      let didPluginOverrideProxy = false;
      if (isSessCmd && !spec.neverProxy && spec.command && driverShouldDoJwpProxy(driver, req, spec.command)) {
        if (
          !('pluginsToHandleCmd' in driver) ||
          typeof driver.pluginsToHandleCmd !== 'function' ||
          driver.pluginsToHandleCmd(spec.command, sessionId).length === 0
        ) {
          await doJwpProxy(driver as BaseDriver<any>, req, res);
          return;
        }
        getLogger(driver, sessionId).debug(
          `Would have proxied ` +
            `command directly, but a plugin exists which might require its value, so will let ` +
            `its value be collected internally and made part of plugin chain`,
        );
        didPluginOverrideProxy = true;
      }

      // if a command is not in our method map, it's because we
      // have no plans to ever implement it
      if (!spec.command) {
        throw new errors.NotImplementedError();
      }

      // wrap params if necessary
      if (spec.payloadParams && spec.payloadParams.wrap) {
        jsonObj = wrapParams(spec.payloadParams, jsonObj);
      }

      // unwrap params if necessary
      if (spec.payloadParams && spec.payloadParams.unwrap) {
        jsonObj = unwrapParams(spec.payloadParams, jsonObj);
      }

      if (spec.command === CREATE_SESSION_COMMAND) {
        // try to determine protocol by session creation args, so we can throw a
        // properly formatted error if arguments validation fails
        currentProtocol = determineProtocol(makeArgs(req.params, jsonObj, spec.payloadParams || {}));
      }

      // ensure that the json payload conforms to the spec
      if (spec.payloadParams) {
        checkParams(spec.payloadParams, jsonObj, currentProtocol);
      }

      // turn the command and json payload into an argument list for
      // the driver methods
      const args = makeArgs(req.params, jsonObj, spec.payloadParams || {});
      let driverRes: any;
      // validate command args according to MJSONWP
      const validator = (validators as Record<string, ((...validatorArgs: any[]) => void) | undefined>)[spec.command];
      if (validator) {
        validator(...args);
      }

      // run the driver command wrapped inside the argument validators
      getLogger(driver, sessionId).debug(
        `Calling %s.%s() with args: %s`,
        driver.constructor.name,
        spec.command,
        logger.markSensitive(util.truncateString(JSON.stringify(args), { length: MAX_LOG_BODY_LENGTH })),
      );

      if (didPluginOverrideProxy) {
        // TODO for now we add this information on the args list, but that's mixing purposes here.
        // We really should add another 'options' parameter to 'executeCommand', but this would be
        // a breaking change for all drivers so would need to be handled carefully.
        args.push({ reqForProxy: req });
      }

      driverRes = await (driver as BaseDriver<any>).executeCommand(spec.command, ...args);

      // Get the protocol after executeCommand
      currentProtocol = extractProtocol(driver, sessionId) || currentProtocol;

      // If `executeCommand` was overridden and the method returns an object
      // with a protocol and value/error property, re-assign the protocol
      if (util.isPlainObject(driverRes) && Object.hasOwn(driverRes, 'protocol')) {
        currentProtocol = (driverRes as { protocol?: keyof typeof PROTOCOLS }).protocol || currentProtocol;
        if (driverRes.error) {
          throw driverRes.error;
        }
        driverRes = driverRes.value;
      }

      // unpack createSession response
      if (spec.command === CREATE_SESSION_COMMAND) {
        newSessionId = driverRes[0];
        getLogger(driver, newSessionId).debug(
          `Cached the protocol value '${currentProtocol}' for the new session ${newSessionId}`,
        );
        if (currentProtocol === PROTOCOLS.MJSONWP) {
          driverRes = driverRes[1];
        } else if (currentProtocol === PROTOCOLS.W3C) {
          driverRes = {
            capabilities: driverRes[1],
          };
        }
      }

      driverRes = formatResponseValue(driverRes);

      // delete should not return anything even if successful
      if (spec.command === DELETE_SESSION_COMMAND) {
        getLogger(driver, sessionId).debug(
          `Received response: ${util.truncateString(JSON.stringify(driverRes), {
            length: MAX_LOG_BODY_LENGTH,
          })}`,
        );
        getLogger(driver, sessionId).debug('But deleting session, so not returning');
        driverRes = null;
      }

      // if the status is not 0,  throw the appropriate error for status code.
      if (util.hasValue(driverRes)) {
        if (util.hasValue(driverRes.status) && !isNaN(driverRes.status) && parseInt(driverRes.status, 10) !== 0) {
          throw errorFromMJSONWPStatusCode(driverRes.status, driverRes.value);
        } else if (util.isPlainObject(driverRes.value) && driverRes.value.error) {
          throw errorFromW3CJsonCode(driverRes.value.error, driverRes.value.message, driverRes.value.stacktrace);
        }
      }

      httpResBody.value = driverRes;
      getLogger(driver, sessionId || newSessionId).debug(
        `Responding ` +
          `to client with driver.${spec.command}() result: ${util.truncateString(JSON.stringify(driverRes), {
            length: MAX_LOG_BODY_LENGTH,
          })}`,
      );
    } catch (err) {
      // if anything goes wrong, figure out what our response should be
      // based on the type of error that we encountered
      let actualErr: Error;
      if (err instanceof Error) {
        actualErr = err;
      } else if (
        typeof err === 'object' &&
        err !== null &&
        Object.hasOwn(err, 'stack') &&
        Object.hasOwn(err, 'message')
      ) {
        actualErr = err as Error;
      } else {
        getLogger(driver, sessionId || newSessionId).warn(
          'The thrown error object does not seem to be a valid instance of the Error class. This ' +
            'might be a genuine bug of a driver or a plugin.',
        );
        actualErr = new Error(`${err ?? 'unknown'}`);
      }

      currentProtocol = currentProtocol || extractProtocol(driver, sessionId || newSessionId);

      const stacktrace = (err as { stacktrace?: string }).stacktrace;
      let errMsg = stacktrace || actualErr.stack || '';
      if (!errMsg.includes(actualErr.message)) {
        // if the message has more information, add it. but often the message
        // is the first part of the stack trace
        errMsg = `${actualErr.message}${errMsg ? '\n' + errMsg : ''}`;
      }
      if (isErrorType(err, errors.ProxyRequestError)) {
        actualErr = err.getActualError();
      } else {
        getLogger(driver, sessionId || newSessionId).debug(`Encountered internal error running command: ${errMsg}`);
      }

      [httpStatus, httpResBody] = getResponseForW3CError(actualErr);
    }

    // decode the response, which is either a string or json
    if (typeof httpResBody === 'string') {
      res.status(httpStatus).setHeader('content-type', 'application/json; charset=utf-8').send(httpResBody);
    } else {
      if (newSessionId && currentProtocol === PROTOCOLS.W3C) {
        httpResBody.value.sessionId = newSessionId;
      }
      res.status(httpStatus).json(ensureW3cResponse(httpResBody));
    }
  };
  // add the method to the app
  const registerRoute = (app as Application & Record<string, (routePath: string, ...handlers: any[]) => void>)[
    method.toLowerCase()
  ].bind(app);
  registerRoute(path, (req: Request, res: Response) => {
    void asyncHandler(req, res);
  });
}

async function doJwpProxy(driver: BaseDriver<any>, req: Request, res: Response): Promise<void> {
  const sessionId = getSessionId(driver, req) as string;
  getLogger(driver, sessionId).info('Driver proxy active, passing request on via HTTP proxy');

  // check that the inner driver has a proxy function
  if (!driver.canProxy(sessionId)) {
    throw new Error('Trying to proxy to a server but the driver is unable to proxy');
  }
  try {
    await driver.executeCommand('proxyReqRes', req, res, sessionId);
  } catch (err) {
    if (isErrorType(err, errors.ProxyRequestError)) {
      throw err;
    }
    if (err instanceof Error) {
      throw new Error(`Could not proxy. Proxy error: ${err.message}`, { cause: err });
    }
    throw new Error(`Could not proxy. Proxy error: ${String(err)}`, { cause: err });
  }
}

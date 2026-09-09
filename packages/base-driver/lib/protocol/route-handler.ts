import {logger, util} from '@appium/support';
import type {Core, Driver, DriverMethodDef, MethodMap} from '@appium/types';
import type {Application, Request, Response} from 'express';

import type {BaseDriver} from '../basedriver/driver.js';
import {DEFAULT_BASE_PATH, MAX_LOG_BODY_LENGTH, PROTOCOLS} from '../constants.js';
import type {RouteConfiguringFunction} from '../express/server.js';
import {errorFromW3CJsonCode, errors, getResponseForW3CError, isErrorType} from './errors.js';
import {ensureW3cResponse, formatResponseValue} from './helpers.js';
import {checkParams, makeArgs, unwrapParams, wrapParams} from './params.js';
import {tryWdProxy} from './proxy.js';
import {CREATE_SESSION_COMMAND, DELETE_SESSION_COMMAND, METHOD_MAP} from './routes/index.js';
import {extractProtocol, getLogger, getSessionId, isSessionCommand} from './session.js';
import {getCommandValidator} from './validators.js';

export const deprecatedCommandsLogged: Set<string> = new Set();

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
  return function addRoutes(app, {basePath = DEFAULT_BASE_PATH, extraMethodMap = {}} = {}) {
    // store basePath on the driver instance so it can use it if necessary
    // for example in determining proxy avoidance
    driver.basePath = basePath;

    const allMethods: MethodMap<Driver> = {...METHOD_MAP, ...extraMethodMap};
    for (const [path, methods] of Object.entries(allMethods)) {
      for (const [method, spec] of Object.entries(methods)) {
        const isSessCommand = spec.command ? isSessionCommand(spec.command) : false;
        // set up the express route handler
        buildHandler(app, method, `${basePath}${path}`, spec, driver, isSessCommand);
      }
    }
  };
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
    let httpResBody = {} as any;
    let httpStatus = 200;
    let newSessionId: string | undefined;
    const sessionId = getSessionId(driver, req);
    let currentProtocol = extractProtocol(driver, sessionId);

    try {
      logDeprecationWarning(driver, method, path, spec, sessionId);
      ensureSessionExists(driver, sessionId, isSessCmd);

      const proxyOutcome = await tryWdProxy(driver, req, res, spec, isSessCmd, sessionId);
      if (proxyOutcome === 'handled') {
        return;
      }
      const didPluginOverrideProxy = proxyOutcome === 'plugin-override';

      // if a command is not in our method map, it's because we
      // have no plans to ever implement it
      if (!spec.command) {
        throw new errors.NotImplementedError();
      }
      const command = spec.command;

      const jsonObj = preparePayload(spec, req.body, currentProtocol);
      const args = buildCommandArgs(req, jsonObj, spec, command, didPluginOverrideProxy);

      // run the driver command wrapped inside the argument validators
      getLogger(driver, sessionId).debug(
        `Calling %s.%s() with args: %s`,
        driver.constructor.name,
        command,
        logger.markSensitive(util.truncateString(JSON.stringify(args), {length: MAX_LOG_BODY_LENGTH})),
      );

      const result = await runDriverCommand(driver, command, args, sessionId, currentProtocol);
      currentProtocol = result.currentProtocol;
      newSessionId = result.newSessionId;
      httpResBody.value = result.driverRes;

      getLogger(driver, sessionId || newSessionId).debug(
        `Responding ` +
          `to client with driver.${command}() result: ${util.truncateString(JSON.stringify(result.driverRes), {
            length: MAX_LOG_BODY_LENGTH,
          })}`,
      );
    } catch (err) {
      currentProtocol = currentProtocol || extractProtocol(driver, sessionId || newSessionId);
      [httpStatus, httpResBody] = buildErrorResponse(err, driver, sessionId || newSessionId);
    }

    sendHandlerResponse(res, httpStatus, httpResBody, newSessionId, currentProtocol);
  };
  // add the method to the app
  const registerRoute = (app as Application & Record<string, (routePath: string, ...handlers: any[]) => void>)[
    method.toLowerCase()
  ].bind(app);
  registerRoute(path, (req: Request, res: Response) => {
    void asyncHandler(req, res);
  });
}

/**
 * Logs (once per command) that a deprecated endpoint was hit.
 */
function logDeprecationWarning(
  driver: Core<any>,
  method: string,
  path: string,
  spec: DriverMethodDef<Driver>,
  sessionId: string | undefined,
): void {
  if (spec.deprecated && spec.command && !deprecatedCommandsLogged.has(spec.command)) {
    deprecatedCommandsLogged.add(spec.command);
    getLogger(driver, sessionId).warn(
      `The ${method} ${path} endpoint has been deprecated and will be removed in a future ` +
        `version of Appium or your driver/plugin. Please use a different endpoint or contact the ` +
        `driver/plugin author to add explicit support for the endpoint before it is removed`,
    );
  }
}

/**
 * Errors out early (especially before proxying) if this is a session command but we don't have a session.
 */
function ensureSessionExists(driver: Core<any>, sessionId: string | undefined, isSessCmd: boolean): void {
  if (isSessCmd && !driver.sessionExists(sessionId)) {
    throw new errors.NoSuchDriverError();
  }
}

/**
 * Wraps/unwraps and validates the JSON payload against the route's payload spec.
 */
function preparePayload(spec: DriverMethodDef<Driver>, jsonObj: any, currentProtocol: keyof typeof PROTOCOLS): any {
  if (spec.payloadParams?.wrap) {
    jsonObj = wrapParams(spec.payloadParams, jsonObj);
  }
  if (spec.payloadParams?.unwrap) {
    jsonObj = unwrapParams(spec.payloadParams, jsonObj);
  }
  if (spec.payloadParams) {
    checkParams(spec.payloadParams, jsonObj, currentProtocol);
  }
  return jsonObj;
}

/**
 * Turns the request into the ordered argument list for the driver command, running any
 * command-specific validator and appending proxy info a plugin might need.
 */
function buildCommandArgs(
  req: Request,
  jsonObj: any,
  spec: DriverMethodDef<Driver>,
  command: string,
  didPluginOverrideProxy: boolean,
): any[] {
  const args = makeArgs(req.params, jsonObj, spec.payloadParams || {});
  const validator = getCommandValidator(command);
  if (validator) {
    validator(...args);
  }

  if (didPluginOverrideProxy) {
    // TODO for now we add this information on the args list, but that's mixing purposes here.
    // We really should add another 'options' parameter to 'executeCommand', but this would be
    // a breaking change for all drivers so would need to be handled carefully.
    args.push({reqForProxy: req});
  }

  return args;
}

interface DriverCommandResult {
  driverRes: any;
  currentProtocol: keyof typeof PROTOCOLS;
  newSessionId?: string;
}

/**
 * Runs the driver command and interprets its result: resolves the protocol used for the
 * response, unpacks the createSession/deleteSession special cases, and raises W3C errors
 * embedded in the result value.
 */
async function runDriverCommand(
  driver: Core<any>,
  command: string,
  args: any[],
  sessionId: string | undefined,
  currentProtocol: keyof typeof PROTOCOLS,
): Promise<DriverCommandResult> {
  let driverRes: any = await (driver as BaseDriver<any>).executeCommand(command, ...args);

  // Get the protocol after executeCommand
  currentProtocol = extractProtocol(driver, sessionId) || currentProtocol;

  // If `executeCommand` was overridden and the method returns an object
  // with a protocol and value/error property, re-assign the protocol
  if (util.isPlainObject(driverRes) && Object.hasOwn(driverRes, 'protocol')) {
    currentProtocol = (driverRes as {protocol?: keyof typeof PROTOCOLS}).protocol || currentProtocol;
    if (driverRes.error) {
      throw driverRes.error;
    }
    driverRes = driverRes.value;
  }

  let newSessionId: string | undefined;
  // unpack createSession response
  if (command === CREATE_SESSION_COMMAND) {
    newSessionId = driverRes[0];
    getLogger(driver, newSessionId).debug(
      `Cached the protocol value '${currentProtocol}' for the new session ${newSessionId}`,
    );
    driverRes = {
      capabilities: driverRes[1],
    };
  }

  driverRes = formatResponseValue(driverRes);

  // delete should not return anything even if successful
  if (command === DELETE_SESSION_COMMAND) {
    getLogger(driver, sessionId).debug(
      `Received response: ${util.truncateString(JSON.stringify(driverRes), {
        length: MAX_LOG_BODY_LENGTH,
      })}`,
    );
    getLogger(driver, sessionId).debug('But deleting session, so not returning');
    driverRes = null;
  }

  if (util.hasValue(driverRes) && util.isPlainObject(driverRes.value) && driverRes.value.error) {
    throw errorFromW3CJsonCode(driverRes.value.error, driverRes.value.message, driverRes.value.stacktrace);
  }

  return {driverRes, currentProtocol, newSessionId};
}

/**
 * Normalizes a thrown value into an Error instance, warning when it wasn't one to begin with.
 */
function normalizeError(err: unknown, driver: Core<any>, sessionId: string | undefined): Error {
  if (err instanceof Error) {
    return err;
  }
  if (typeof err === 'object' && err !== null && Object.hasOwn(err, 'stack') && Object.hasOwn(err, 'message')) {
    return err as Error;
  }
  getLogger(driver, sessionId).warn(
    'The thrown error object does not seem to be a valid instance of the Error class. This ' +
      'might be a genuine bug of a driver or a plugin.',
  );
  return new Error(`${err ?? 'unknown'}`);
}

/**
 * Figures out the HTTP status/body to send back for an error thrown while handling the request.
 */
function buildErrorResponse(err: unknown, driver: Core<any>, sessionId: string | undefined): [number, any] {
  let actualErr = normalizeError(err, driver, sessionId);

  const stacktrace = (err as {stacktrace?: string}).stacktrace;
  let errMsg = stacktrace || actualErr.stack || '';
  if (!errMsg.includes(actualErr.message)) {
    // if the message has more information, add it. but often the message
    // is the first part of the stack trace
    errMsg = `${actualErr.message}${errMsg ? '\n' + errMsg : ''}`;
  }
  if (isErrorType(err, errors.ProxyRequestError)) {
    actualErr = err.getActualError();
  } else {
    getLogger(driver, sessionId).debug(`Encountered internal error running command: ${errMsg}`);
  }

  return getResponseForW3CError(actualErr);
}

/**
 * Writes the final HTTP response, either the pre-serialized string or the JSON body.
 */
function sendHandlerResponse(
  res: Response,
  httpStatus: number,
  httpResBody: any,
  newSessionId: string | undefined,
  currentProtocol: keyof typeof PROTOCOLS,
): void {
  if (typeof httpResBody === 'string') {
    res.status(httpStatus).setHeader('content-type', 'application/json; charset=utf-8').send(httpResBody);
    return;
  }
  if (newSessionId && currentProtocol === PROTOCOLS.W3C) {
    httpResBody.value.sessionId = newSessionId;
  }
  res.status(httpStatus).json(ensureW3cResponse(httpResBody));
}

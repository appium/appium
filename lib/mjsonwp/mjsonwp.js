import _ from 'lodash';
import { logger, util } from 'appium-support';
import { validators } from './validators';
import { errors, isErrorType, MJSONWPError, errorFromCode } from './errors';
import { METHOD_MAP, NO_SESSION_ID_COMMANDS } from './routes';
import B from 'bluebird';


const log = logger.getLogger('MJSONWP');
const JSONWP_SUCCESS_STATUS_CODE = 0;
// TODO: Make this value configurable as a server side capability
const LOG_OBJ_LENGTH = 1024; // MAX LENGTH Logged to file / console

class MJSONWP {}

function isSessionCommand (command) {
  return !_.includes(NO_SESSION_ID_COMMANDS, command);
}

function wrapParams (paramSets, jsonObj) {
  /* There are commands like performTouch which take a single parameter (primitive type or array).
   * Some drivers choose to pass this parameter as a value (eg. [action1, action2...]) while others to
   * wrap it within an object(eg' {gesture:  [action1, action2...]}), which makes it hard to validate.
   * The wrap option in the spec enforce wrapping before validation, so that all params are wrapped at
   * the time they are validated and later passed to the commands.
   */
  let res = jsonObj;
  if (_.isArray(jsonObj) || !_.isObject(jsonObj)) {
    res = {};
    res[paramSets.wrap] = jsonObj;
  }
  return res;
}

function unwrapParams (paramSets, jsonObj) {
  /* There are commands like setNetworkConnection which send parameters wrapped inside a key such as
   * "parameters". This function unwraps them (eg. {"parameters": {"type": 1}} becomes {"type": 1}).
   */
  let res = jsonObj;
  if (_.isObject(jsonObj)) {
    // some clients, like ruby, don't wrap
    if (jsonObj[paramSets.unwrap]) {
      res = jsonObj[paramSets.unwrap];
    }
  }
  return res;
}

function checkParams (paramSets, jsonObj) {
  let requiredParams = [];
  let optionalParams = [];
  let receivedParams = _.keys(jsonObj);

  if (paramSets) {
    if (paramSets.required) {
      // we might have an array of parameters,
      // or an array of arrays of parameters, so standardize
      if (!_.isArray(_.first(paramSets.required))) {
        requiredParams = [paramSets.required];
      } else {
        requiredParams = paramSets.required;
      }
    }
    // optional parameters are just an array
    if (paramSets.optional) {
      optionalParams = paramSets.optional;
    }

    // If a function was provided as the 'validate' key, it will here be called with
    // jsonObj as the param. If it returns something falsy, verification will be
    // considered to have passed. If it returns something else, that will be the
    // argument to an error which is thrown to the user
    if (paramSets.validate) {
      let message = paramSets.validate(jsonObj);
      if (message) {
        throw new errors.BadParametersError(message, jsonObj);
      }
    }
  }

  // if we have no required parameters, all is well
  if (requiredParams.length === 0) {
    return;
  }

  // some clients pass in the session id in the params
  if (optionalParams.indexOf('sessionId') === -1) {
    optionalParams.push('sessionId');
  }

  // some clients pass in an element id in the params
  if (optionalParams.indexOf('id') === -1) {
    optionalParams.push('id');
  }

  // go through the required parameters and check against our arguments
  for (let params of requiredParams) {
    if (_.difference(receivedParams, params, optionalParams).length === 0 &&
        _.difference(params, receivedParams).length === 0) {
      // we have a set of parameters that is correct
      // so short-circuit
      return;
    }
  }
  throw new errors.BadParametersError(paramSets, receivedParams);
}

/*
 * This method takes 3 pieces of data: request parameters ('requestParams'),
 * a request JSON body ('jsonObj'), and 'payloadParams', which is the section
 * from the route definition for a particular endpoint which has instructions
 * on handling parameters. This method returns an array of arguments which will
 * be applied to a command.
 */
function makeArgs (requestParams, jsonObj, payloadParams) {
  // We want to pass the "url" parameters to the commands in reverse order
  // since the command will sometimes want to ignore, say, the sessionId.
  // This has the effect of putting sessionId last, which means in JS we can
  // omit it from the function signature if we're not going to use it.
  let urlParams = _.keys(requestParams).reverse();

  // In the simple case, the required parameters are a basic array in
  // payloadParams.required, so start there. It's possible that there are
  // multiple optional sets of required params, though, so handle that case
  // too.
  let requiredParams = payloadParams.required;
  if (_.isArray(_.first(payloadParams.required))) {
    // If there are optional sets of required params, then we will have an
    // array of arrays in payloadParams.required, so loop through each set and
    // pick the one that matches which JSON params were actually sent. We've
    // already been through validation so we're guaranteed to find a match.
    let keys = _.keys(jsonObj);
    for (let params of payloadParams.required) {
      if (_.without(params, ...keys).length === 0) {
        requiredParams = params;
        break;
      }
    }
  }

  // Now we construct our list of arguments which will be passed to the command
  let args;
  if (_.isFunction(payloadParams.makeArgs)) {
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
    args = _.flatten(requiredParams).map((p) => jsonObj[p]);
    if (payloadParams.optional) {
      args = args.concat(_.flatten(payloadParams.optional).map((p) => jsonObj[p]));
    }
  }
  // Finally, get our url params (session id, element id, etc...) on the end of
  // the list
  args = args.concat(urlParams.map((u) => requestParams[u]));
  return args;
}

function getResponseForJsonwpError (err) {
  let httpStatus = 500;
  let httpResBody = {
    status: err.jsonwpCode,
    value: {
      message: err.message
    }
  };

  if (isErrorType(err, errors.BadParametersError)) {
    // respond with a 400 if we have bad parameters
    log.debug(`Bad parameters: ${err}`);
    httpStatus = 400;
    httpResBody = err.message;
  } else if (isErrorType(err, errors.NotYetImplementedError) ||
             isErrorType(err, errors.NotImplementedError)) {
    // respond with a 501 if the method is not implemented
    httpStatus = 501;
  } else if (isErrorType(err, errors.NoSuchDriverError)) {
    // respond with a 404 if there is no driver for the session
    httpStatus = 404;
  }


  return [httpStatus, httpResBody];
}

function routeConfiguringFunction (driver) {
  if (!driver.sessionExists) {
    throw new Error('Drivers used with MJSONWP must implement `sessionExists`');
  }

  if (!(driver.executeCommand || driver.execute)) {
    throw new Error('Drivers used with MJSONWP must implement `executeCommand` or `execute`');
  }

  // return a function which will add all the routes to the driver
  return function (app) {
    for (let [path, methods] of _.toPairs(METHOD_MAP)) {
      for (let [method, spec] of _.toPairs(methods)) {
        // set up the express route handler
        buildHandler(app, method, path, spec, driver, isSessionCommand(spec.command));
      }
    }
  };
}

function buildHandler (app, method, path, spec, driver, isSessCmd) {
  let asyncHandler = async (req, res) => {
    let jsonObj = req.body;
    let httpResBody = {};
    let httpStatus = 200;
    let newSessionId;
    try {
      // if this is a session command but we don't have a session,
      // error out early (especially before proxying)
      if (isSessCmd && !driver.sessionExists(req.params.sessionId)) {
        throw new errors.NoSuchDriverError();
      }

      // if the driver is currently proxying commands to another JSONWP
      // server, bypass all our checks and assume the upstream server knows
      // what it's doing. But keep this in the try/catch block so if proxying
      // itself fails, we give a message to the client. Of course we only
      // want to do these when we have a session command; the Appium driver
      // must be responsible for start/stop session, etc...
      if (isSessCmd && driverShouldDoJwpProxy(driver, req, spec.command)) {
        await doJwpProxy(driver, req, res);
        return;
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

      // ensure that the json payload conforms to the spec
      checkParams(spec.payloadParams, jsonObj);
      // ensure the session the user is trying to use is valid

      // turn the command and json payload into an argument list for
      // the driver methods
      let args = makeArgs(req.params, jsonObj, spec.payloadParams || []);
      let driverRes;
      // validate command args according to MJSONWP
      if (validators[spec.command]) {
        validators[spec.command](...args);
      }
      // run the driver command wrapped inside the argument validators
      log.debug(`Calling ${driver.constructor.name}.${spec.command}() with args: ` +
                _.truncate(JSON.stringify(args), {length: LOG_OBJ_LENGTH}));

      if (driver.executeCommand) {
        driverRes = await driver.executeCommand(spec.command, ...args);
      } else {
        driverRes = await driver.execute(spec.command, ...args);
      }

      // unpack createSession response
      if (spec.command === 'createSession') {
        newSessionId = driverRes[0];
        driverRes = driverRes[1];
      }

      // convert undefined to null, but leave all other values the same
      if (_.isUndefined(driverRes)) {
        driverRes = null;
      }

      // delete should not return anything even if successful
      if (spec.command === 'deleteSession') {
        log.debug(`Received response: ${_.truncate(JSON.stringify(driverRes), {length: LOG_OBJ_LENGTH})}`);
        log.debug('But deleting session, so not returning');
        driverRes = null;
      }

      // if the status is not 0,  throw the appropriate error for status code.
      if (util.hasValue(driverRes) && util.hasValue(driverRes.status) && parseInt(driverRes.status, 10) !== 0) {
        throw errorFromCode(driverRes.status, driverRes.value);
      }

      // Response status should be the status set by the driver response.
      httpResBody.status = (_.isNil(driverRes) || _.isUndefined(driverRes.status)) ? JSONWP_SUCCESS_STATUS_CODE : driverRes.status;
      httpResBody.value = driverRes;
      log.debug(`Responding to client with driver.${spec.command}() ` +
               `result: ${_.truncate(JSON.stringify(driverRes), {length: LOG_OBJ_LENGTH})}`);
    } catch (err) {
      let actualErr = err;
      if (isErrorType(err, errors.ProxyRequestError)) {
        log.error(`Encountered internal error running command:  ${JSON.stringify(err)} ${err.stack}`);
        actualErr = err.getActualError();
      } else if (!(isErrorType(err, MJSONWPError) ||
            isErrorType(err, errors.BadParametersError))) {
        log.error(`Encountered internal error running command: ${err.stack}`);
        actualErr = new errors.UnknownError(err);
      }
      // if anything goes wrong, figure out what our response should be
      // based on the type of error that we encountered
      [httpStatus, httpResBody] = getResponseForJsonwpError(actualErr);
    }

    // decode the response, which is either a string or json
    if (_.isString(httpResBody)) {
      res.status(httpStatus).send(httpResBody);
    } else {
      if (newSessionId) {
        httpResBody.sessionId = newSessionId;
      } else {
        httpResBody.sessionId = req.params.sessionId || null;
      }

      res.status(httpStatus).json(httpResBody);
    }
  };
  // add the method to the app
  app[method.toLowerCase()](path, (req, res) => {
    B.resolve(asyncHandler(req, res)).done();
  });
}

function driverShouldDoJwpProxy (driver, req, command) {
  // drivers need to explicitly say when the proxy is active
  if (!driver.proxyActive(req.params.sessionId)) {
    return false;
  }

  // we should never proxy deleteSession because we need to give the containing
  // driver an opportunity to clean itself up
  if (command === 'deleteSession') {
    return false;
  }

  // validate avoidance schema, and say we shouldn't proxy if anything in the
  // avoid list matches our req
  let proxyAvoidList = driver.getProxyAvoidList(req.params.sessionId);
  for (let avoidSchema of proxyAvoidList) {
    if (!_.isArray(avoidSchema) || avoidSchema.length !== 2) {
      throw new Error('Proxy avoidance must be a list of pairs');
    }
    let [avoidMethod, avoidPathRegex] = avoidSchema;
    if (!_.includes(['GET', 'POST', 'DELETE'], avoidMethod)) {
      throw new Error(`Unrecognized proxy avoidance method '${avoidMethod}'`);
    }
    if (!(avoidPathRegex instanceof RegExp)) {
      throw new Error('Proxy avoidance path must be a regular expression');
    }
    let normalizedUrl = req.originalUrl.replace(/^\/wd\/hub/, '');
    if (avoidMethod === req.method && avoidPathRegex.test(normalizedUrl)) {
      return false;
    }
  }

  return true;
}

async function doJwpProxy (driver, req, res) {
  log.info('Driver proxy active, passing request on via HTTP proxy');

  // check that the inner driver has a proxy function
  if (!driver.canProxy(req.params.sessionId)) {
    throw new Error('Trying to proxy to a JSONWP server but driver is unable to proxy');
  }
  try {
    await driver.executeCommand('proxyReqRes', req, res, req.params.sessionId);
  } catch (err) {
    if (isErrorType(err, errors.ProxyRequestError)) {
      throw err;
    } else {
      throw new Error(`Could not proxy. Proxy error: ${err.message}`);
    }
  }
}


export { MJSONWP, routeConfiguringFunction, isSessionCommand };

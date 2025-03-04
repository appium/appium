import _ from 'lodash';
import B from 'bluebird';
import vm from 'node:vm';
import {logger, util} from 'appium/support';

const log = logger.getLogger('ExecuteDriver Child');
/**
 * @type {(res: ScriptResult) => Promise<void>}
 */
let send;

// duplicate defining these keys here so we don't need to re-load a huge appium
// dependency tree into memory just to run a wdio script
export const W3C_ELEMENT_KEY = util.W3C_WEB_ELEMENT_IDENTIFIER;
export const MJSONWP_ELEMENT_KEY = 'ELEMENT';

/**
 * Run the script in a VM.
 * @param {DriverScriptMessageEvent} eventParams
 * @returns {Promise<RunScriptResult>}
 * @throws {TypeError}
 */
async function runScript(eventParams) {
  const {driverOpts, script, timeoutMs} = eventParams;
  if (!_.isNumber(timeoutMs)) {
    throw new TypeError('Timeout parameter must be a number');
  }

  /**
   * set up fake logger
   * @type {string[]}
   */
  const logLevels = ['error', 'warn', 'log'];
  const logs = {};
  const consoleFns = {};
  for (const level of logLevels) {
    logs[level] = [];
    consoleFns[level] = (...logMsgs) => logs[level].push(...logMsgs);
  }

  const {attach} = await import('webdriverio');

  const driver = await attach(driverOpts);

  const fullScript = `(async () => {${script}})();`;

  log.info('Running driver script in Node vm');

  // run the driver script, giving user access to the driver object, a fake
  // console logger, and a promise library
  let result = await vm.runInNewContext(
    fullScript,
    {driver, console: consoleFns, Promise: B},
    {timeout: timeoutMs, breakOnSigint: true},
  );

  result = coerceScriptResult(result);
  log.info('Successfully ensured driver script result is appropriate type for return');
  return {result, logs};
}

/**
 * We can get any manner of crazy thing back from a vm executing untrusted
 * code. We might also get WebdriverIO objects that aren't suitable for JSON
 * response. So make sure we convert the things we know about to their
 * appropriate response format, and squash other weird things.
 *
 * @param {Object} obj - object to convert and sanitize
 *
 * @return {Object} - safely converted object
 */
function coerceScriptResult(obj) {
  // first ensure obj is of a type that can be JSON encoded safely. This will
  // get rid of custom objects, functions, etc... and turn them into POJOs
  try {
    obj = JSON.parse(JSON.stringify(obj));
  } catch {
    log.warn(
      'Could not convert executeDriverScript to safe response!' +
        `Result was: ${JSON.stringify(obj)}. Will make it null`,
    );
    return null;
  }

  let res;

  // now we begin our recursive case options
  if (_.isPlainObject(obj)) {
    // if we have an object, it's either an element object or something else
    // webdriverio has no monadic object types other than element and driver,
    // and we don't want to allow special casing return of driver
    res = {};

    if (obj[MJSONWP_ELEMENT_KEY] || obj[W3C_ELEMENT_KEY]) {
      // if it's an element object, clear out anything that's not the key, and then return the
      // object. Note that if the element object contains only one element key type (MJSONWP or
      // W3C), keep it that way in our response. But if the element contains both key types
      // (because the client is being backwards compatible) then keep both keys in our response as
      // well.
      if (obj[MJSONWP_ELEMENT_KEY]) {
        res[MJSONWP_ELEMENT_KEY] = obj[MJSONWP_ELEMENT_KEY];
      }

      if (obj[W3C_ELEMENT_KEY]) {
        res[W3C_ELEMENT_KEY] = obj[W3C_ELEMENT_KEY];
      }
      return res;
    }

    // otherwise, recurse into the object
    for (const key of Object.keys(obj)) {
      res[key] = coerceScriptResult(obj[key]);
    }
    return res;
  }

  // also handle arrays
  if (_.isArray(obj)) {
    return obj.map(coerceScriptResult);
  }

  // base case, if it's not an object or array, return straightaway
  return obj;
}

/**
 * Entry point to runScript
 * @param {DriverScriptMessageEvent} eventParams
 */
async function main(eventParams) {
  /**
   * keep the response of runScript
   * @type {ScriptResult}
   */
  let res;
  log.info('Parameters received from parent process');
  try {
    res = {success: await runScript(eventParams)};
    log.info('runScript success');
  } catch (error) {
    log.info('runScript error');
    res = {error: {message: error.message, stack: error.stack}};
  }
  await send(res);
}

// ensure we're running this script in IPC mode
if (require.main === module && _.isFunction(process.send)) {
  send = B.promisify(process.send, {context: process});
  log.info('Running driver execution in child process');
  process.on('message', main);
}


/**
 * @typedef DriverScriptMessageEvent
 * @property {any} driverOpts - the driver options
 * @property {string} script - the javascript to execute
 * @property {number} timeoutMs - script timeout in milliseconds
 */

/**
 * @typedef ScriptResult
 * @property {any} [success]
 * @property {ScriptResultError} [error]
 */

/**
 * @typedef ScriptResultError
 * @property {any} message
 * @property {any} stack
 */

/**
 * @typedef RunScriptResult
 * @property {any} result
 * @property {object} logs
 */

import _ from 'lodash';
import B from 'bluebird';
import {NodeVM} from 'vm2';
import {logger, util} from '@appium/support';
import {attach} from 'webdriverio';

const log = logger.getLogger('ExecuteDriver Child');
let send;

// duplicate defining these keys here so we don't need to re-load a huge appium
// dependency tree into memory just to run a wdio script
export const W3C_ELEMENT_KEY = util.W3C_WEB_ELEMENT_IDENTIFIER;
export const MJSONWP_ELEMENT_KEY = 'ELEMENT';

async function runScript(driverOpts, script, timeoutMs) {
  if (!_.isNumber(timeoutMs)) {
    throw new TypeError('Timeout parameter must be a number');
  }

  // set up fake logger
  const logLevels = ['error', 'warn', 'log'];
  const logs = {};
  const consoleFns = {};
  for (const level of logLevels) {
    logs[level] = [];
    consoleFns[level] = (...logMsgs) => logs[level].push(...logMsgs);
  }

  const driver = await attach(driverOpts);

  const fullScript = buildScript(script);

  log.info('Running driver script in Node vm');

  const vmCtx = new NodeVM({timeout: timeoutMs});
  const vmFn = vmCtx.run(fullScript);

  // run the driver script, giving user access to the driver object, a fake
  // console logger, and a promise library
  let result = await vmFn(driver, consoleFns, B);

  result = coerceScriptResult(result);
  log.info(
    'Successfully ensured driver script result is appropriate type for return'
  );
  return {result, logs};
}

/**
 * Embed a user-generated script inside a method which takes only the
 * predetermined objects we specify
 *
 * @param {string} script - the javascript to execute
 *
 * @return {string} - the full script to execute
 */
function buildScript(script) {
  return `module.exports = async function execute (driver, console, Promise) {
    ${script}
  }`;
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
  } catch (e) {
    log.warn(
      'Could not convert executeDriverScript to safe response!' +
        `Result was: ${JSON.stringify(obj)}. Will make it null`
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

async function main(driverOpts, script, timeoutMs) {
  let res;
  try {
    res = {success: await runScript(driverOpts, script, timeoutMs)};
  } catch (error) {
    res = {error: {message: error.message, stack: error.stack}};
  }
  await send(res);
}

// ensure we're running this script in IPC mode
if (require.main === module && _.isFunction(process.send)) {
  send = B.promisify(process.send, {context: process});
  log.info('Running driver execution in child process');
  process.on('message', ({driverOpts, script, timeoutMs}) => {
    log.info('Parameters received from parent process');
    main(driverOpts, script, timeoutMs);
  });
}

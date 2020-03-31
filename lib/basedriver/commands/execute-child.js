import _ from 'lodash';
import B from 'bluebird';
import vm from 'vm';
import log from '../logger';
import { attach } from 'webdriverio';

// duplicate defining these keys here so we don't need to re-load a huge appium
// dependency tree into memory just to run a wdio script
const W3C_ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';
const MJSONWP_ELEMENT_KEY = 'ELEMENT';

async function runScript (driverOpts, script, timeout) {
  if (!_.isNumber(timeout)) {
    throw new Error('Timeout parameter must be a number');
  }

  // set up fake logger
  const logLevels = ['error', 'warn', 'log'];
  const logs = {};
  const consoleFns = {};
  for (const level of logLevels) {
    logs[level] = [];
    consoleFns[level] = (...logMsgs) => logs[level].push(...logMsgs);
  }

  const driver = attach(driverOpts);

  const fullScript = buildScript(script);
  // the timeout here will not matter really, but set it anyway to be on the
  // safe side
  const vmCtx = vm.runInNewContext(fullScript, {}, {timeout});

  // run the driver script, giving user access to the driver object, a fake
  // console logger, and a promise library
  log.info('Running driver script in Node vm');
  let result = await vmCtx(driver, consoleFns, B);

  log.info('Ensuring driver script result is appropriate type for return');
  result = coerceScriptResult(result);
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
function buildScript (script) {
  return `(async function execute (driver, console, Promise) {
    ${script}
  })`;
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
function coerceScriptResult (obj) {
  // first ensure obj is of a type that can be JSON encoded safely. This will
  // get rid of custom objects, functions, etc... and turn them into POJOs
  try {
    obj = JSON.parse(JSON.stringify(obj));
  } catch (e) {
    log.warn('Could not convert executeDriverScript to safe response!' +
             `Result was: ${obj}. Will make it null`);
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
      // if it's an element object, clear out anything that's not the key, and
      // then return the object
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

  // in the cae of an array, just recurse into the items
  if (_.isArray(obj)) {
    return obj.map(coerceScriptResult);
  }

  // base case, if it's not an object or array, return straightaway
  return obj;
}

async function main (driverOpts, script, timeout) {
  let res;
  try {
    res = {success: await runScript(driverOpts, script, timeout)};
  } catch (error) {
    res = {error: {message: error.message, stack: error.stack}};
  }
  await B.promisify(process.send, {context: process})(res);
}

if (require.main === module) {
  log.info('Running driver execution in child process');
  process.on('message', ({driverOpts, script, timeout}) => {
    log.info('Parameters received from parent process');
    main(driverOpts, script, timeout);
  });
}

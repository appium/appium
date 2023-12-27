import {isWindows} from './system';
import log from './logger';
import _ from 'lodash';
import {exec} from 'teen_process';
import path from 'path';
import _fs from 'fs';
import {v4 as uuidV4} from 'uuid';

const ECMA_SIZES = Object.freeze({
  STRING: 2,
  BOOLEAN: 4,
  NUMBER: 8,
});

/**
 * Internal utility to link global package to local context
 *
 * @param {string} packageName - name of the package to link
 * @throws {Error} If the command fails
 */
async function linkGlobalPackage(packageName) {
  try {
    log.debug(`Linking package '${packageName}'`);
    const cmd = isWindows() ? 'npm.cmd' : 'npm';
    await exec(cmd, ['link', packageName], {timeout: 20000});
  } catch (err) {
    const msg = `Unable to load package '${packageName}', linking failed: ${err.message}`;
    log.debug(msg);
    if (err.stderr) {
      // log the stderr if there, but do not add to thrown error as it is
      // _very_ verbose
      log.debug(err.stderr);
    }
    throw new Error(msg);
  }
}

/**
 * Utility function to extend node functionality, allowing us to require
 * modules that are installed globally. If the package cannot be required,
 * this will attempt to link the package and then re-require it
 *
 * @param {string} packageName - the name of the package to be required
 * @returns {Promise<unknown>} - the package object
 * @throws {Error} If the package is not found locally or globally
 */
async function requirePackage(packageName) {
  // first, get it in the normal way (see https://nodejs.org/api/modules.html#modules_all_together)
  try {
    log.debug(`Loading local package '${packageName}'`);
    return require(packageName);
  } catch (err) {
    log.debug(`Failed to load local package '${packageName}': ${err.message}`);
  }

  // second, get it from where it ought to be in the global node_modules
  try {
    const globalPackageName = path.resolve(
      process.env.npm_config_prefix ?? '',
      'lib',
      'node_modules',
      packageName
    );
    log.debug(`Loading global package '${globalPackageName}'`);
    return require(globalPackageName);
  } catch (err) {
    log.debug(`Failed to load global package '${packageName}': ${err.message}`);
  }

  // third, link the file and get locally
  try {
    await linkGlobalPackage(packageName);
    log.debug(`Retrying load of linked package '${packageName}'`);
    return require(packageName);
  } catch (err) {
    throw log.errorWithException(`Unable to load package '${packageName}': ${err.message}`);
  }
}

function extractAllProperties(obj) {
  const stringProperties = [];
  for (const prop in obj) {
    stringProperties.push(prop);
  }
  if (_.isFunction(Object.getOwnPropertySymbols)) {
    stringProperties.push(...Object.getOwnPropertySymbols(obj));
  }
  return stringProperties;
}

function _getSizeOfObject(seen, object) {
  if (_.isNil(object)) {
    return 0;
  }

  let bytes = 0;
  const properties = extractAllProperties(object);
  for (const key of properties) {
    // Do not recalculate circular references
    if (typeof object[key] === 'object' && !_.isNil(object[key])) {
      if (seen.has(object[key])) {
        continue;
      }
      seen.add(object[key]);
    }

    bytes += getCalculator(seen)(key);
    try {
      bytes += getCalculator(seen)(object[key]);
    } catch (ex) {
      if (ex instanceof RangeError) {
        // circular reference detected, final result might be incorrect
        // let's be nice and not throw an exception
        bytes = 0;
      }
    }
  }

  return bytes;
}

function getCalculator(seen) {
  return function calculator(obj) {
    if (_.isBuffer(obj)) {
      return obj.length;
    }

    switch (typeof obj) {
      case 'string':
        return obj.length * ECMA_SIZES.STRING;
      case 'boolean':
        return ECMA_SIZES.BOOLEAN;
      case 'number':
        return ECMA_SIZES.NUMBER;
      case 'symbol':
        return _.isFunction(Symbol.keyFor) && Symbol.keyFor(obj)
          ? /** @type {string} */ (Symbol.keyFor(obj)).length * ECMA_SIZES.STRING
          : (obj.toString().length - 8) * ECMA_SIZES.STRING;
      case 'object':
        return _.isArray(obj)
          ? obj.map(getCalculator(seen)).reduce((acc, curr) => acc + curr, 0)
          : _getSizeOfObject(seen, obj);
      default:
        return 0;
    }
  };
}

/**
 * Calculate the in-depth size in memory of the provided object.
 * The original implementation is borrowed from https://github.com/miktam/sizeof.
 *
 * @param {*} obj An object whose size should be calculated
 * @returns {number} Object size in bytes.
 */
function getObjectSize(obj) {
  return getCalculator(new WeakSet())(obj);
}

const OBJECTS_MAPPING = new WeakMap();

/**
 * Calculates a unique object identifier
 *
 * @param {object} object Any valid ECMA object
 * @returns {string} A uuidV4 string that uniquely identifies given object
 */
function getObjectId(object) {
  if (!OBJECTS_MAPPING.has(object)) {
    OBJECTS_MAPPING.set(object, uuidV4());
  }
  return OBJECTS_MAPPING.get(object);
}

/**
 * Perform deep freeze of the given object (e. g.
 * all nested objects also become immutable).
 * If the passed object is of a plain type
 * then no change is done and the same object
 * is returned.
 * ! This function changes the given object,
 * so it becomes immutable.
 *
 * @param {*} object Any valid ECMA object
 * @returns {*} The same object that was passed to the
 * function after it was made immutable.
 */
function deepFreeze(object) {
  let propNames;
  try {
    propNames = Object.getOwnPropertyNames(object);
  } catch (ign) {
    return object;
  }
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  }
  return Object.freeze(object);
}

/**
 * Tries to synchronously detect the absolute path to the folder
 * where the given `moduleName` is located.
 *
 * @param {string} moduleName The name of the module as it is written in package.json
 * @param {string} filePath Full path to any of files that `moduleName` contains. Use
 * `__filename` to find the root of the module where this helper is called.
 * @returns {string?} Full path to the module root
 */
function getModuleRootSync (moduleName, filePath) {
  let currentDir = path.dirname(path.resolve(filePath));
  let isAtFsRoot = false;
  while (!isAtFsRoot) {
    const manifestPath = path.join(currentDir, 'package.json');
    try {
      if (_fs.existsSync(manifestPath) &&
          JSON.parse(_fs.readFileSync(manifestPath, 'utf8')).name === moduleName) {
        return currentDir;
      }
    } catch (ign) {}
    currentDir = path.dirname(currentDir);
    isAtFsRoot = currentDir.length <= path.dirname(currentDir).length;
  }
  return null;
}

export {requirePackage, getObjectSize, getObjectId, deepFreeze, getModuleRootSync};

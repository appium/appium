import {isWindows} from './system';
import log from './logger';
import _ from 'lodash';
import {exec} from 'teen_process';
import path from 'node:path';
import _fs from 'node:fs';
import {v4 as uuidV4} from 'uuid';

const OBJECTS_MAPPING = new WeakMap<object, string>();

/**
 * Utility function to extend node functionality, allowing us to require
 * modules that are installed globally. If the package cannot be required,
 * this will attempt to link the package and then re-require it
 *
 * @param packageName - the name of the package to be required
 * @returns The package object
 * @throws {Error} If the package is not found locally or globally
 */
export async function requirePackage(packageName: string): Promise<unknown> {
  try {
    log.debug(`Loading local package '${packageName}'`);
    return require(packageName);
  } catch (err) {
    log.debug(`Failed to load local package '${packageName}': ${(err as Error).message}`);
  }

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
    log.debug(`Failed to load global package '${packageName}': ${(err as Error).message}`);
  }

  try {
    await linkGlobalPackage(packageName);
    log.debug(`Retrying load of linked package '${packageName}'`);
    return require(packageName);
  } catch (err) {
    throw log.errorWithException(
      `Unable to load package '${packageName}': ${(err as Error).message}`
    );
  }
}

/**
 * Calculate the in-depth size in memory of the provided object.
 * The original implementation is borrowed from https://github.com/miktam/sizeof.
 *
 * @param obj - An object whose size should be calculated
 * @returns Object size in bytes.
 */
export function getObjectSize(obj: unknown): number {
  return getCalculator(new WeakSet())(obj);
}

/**
 * Calculates a unique object identifier
 *
 * @param object - Any valid ECMA object
 * @returns A uuidV4 string that uniquely identifies given object
 */
export function getObjectId(object: object): string {
  const existing = OBJECTS_MAPPING.get(object);
  if (existing !== undefined) {
    return existing;
  }
  const id = uuidV4();
  OBJECTS_MAPPING.set(object, id);
  return id;
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
 * @param object - Any valid ECMA object
 * @returns The same object that was passed after it was made immutable.
 */
export function deepFreeze<T>(object: T): T {
  let propNames: string[];
  try {
    propNames = Object.getOwnPropertyNames(object as object);
  } catch {
    return object;
  }
  for (const name of propNames) {
    const value = (object as Record<string, unknown>)[name];
    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  }
  return Object.freeze(object) as T;
}

/**
 * Tries to synchronously detect the absolute path to the folder
 * where the given `moduleName` is located.
 *
 * @param moduleName - The name of the module as it is written in package.json
 * @param filePath - Full path to any of files that `moduleName` contains. Use
 * `__filename` to find the root of the module where this helper is called.
 * @returns Full path to the module root, or null if not found
 */
export function getModuleRootSync(moduleName: string, filePath: string): string | null {
  let currentDir = path.dirname(path.resolve(filePath));
  let isAtFsRoot = false;
  while (!isAtFsRoot) {
    const manifestPath = path.join(currentDir, 'package.json');
    try {
      if (
        _fs.existsSync(manifestPath) &&
        (JSON.parse(_fs.readFileSync(manifestPath, 'utf8')) as {name?: string}).name === moduleName
      ) {
        return currentDir;
      }
    } catch {
      // ignore
    }
    currentDir = path.dirname(currentDir);
    isAtFsRoot = currentDir.length <= path.dirname(currentDir).length;
  }
  return null;
}

// #region Private

const ECMA_SIZES = Object.freeze({
  STRING: 2,
  BOOLEAN: 4,
  NUMBER: 8,
});

type SizeCalculator = (obj: unknown) => number;

async function linkGlobalPackage(packageName: string): Promise<void> {
  try {
    log.debug(`Linking package '${packageName}'`);
    const cmd = isWindows() ? 'npm.cmd' : 'npm';
    await exec(cmd, ['link', packageName], {timeout: 20000});
  } catch (err) {
    const e = err as Error & {stderr?: string};
    const msg = `Unable to load package '${packageName}', linking failed: ${e.message}`;
    log.debug(msg);
    if (e.stderr) {
      log.debug(e.stderr);
    }
    throw new Error(msg);
  }
}

function extractAllProperties(obj: object): (string | symbol)[] {
  const stringProperties: (string | symbol)[] = [];
  for (const prop in obj) {
    stringProperties.push(prop);
  }
  if (_.isFunction(Object.getOwnPropertySymbols)) {
    stringProperties.push(...Object.getOwnPropertySymbols(obj));
  }
  return stringProperties;
}

function _getSizeOfObject(seen: WeakSet<object>, object: object): number {
  if (_.isNil(object)) {
    return 0;
  }

  let bytes = 0;
  const properties = extractAllProperties(object);
  const calc = getCalculator(seen);
  for (const key of properties) {
    const val = (object as Record<string | symbol, unknown>)[key];
    if (typeof val === 'object' && !_.isNil(val)) {
      if (seen.has(val as object)) {
        continue;
      }
      seen.add(val as object);
    }

    bytes += calc(key);
    try {
      bytes += calc(val);
    } catch (ex) {
      if (ex instanceof RangeError) {
        bytes = 0;
      }
    }
  }

  return bytes;
}

function getCalculator(seen: WeakSet<object>): SizeCalculator {
  return function calculator(obj: unknown): number {
    if (_.isBuffer(obj)) {
      return (obj as Buffer).length;
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
          ? (Symbol.keyFor(obj) as string).length * ECMA_SIZES.STRING
          : (obj.toString().length - 8) * ECMA_SIZES.STRING;
      case 'object':
        return _.isArray(obj)
          ? obj.map(getCalculator(seen)).reduce((acc, curr) => acc + curr, 0)
          : _getSizeOfObject(seen, obj as object);
      default:
        return 0;
    }
  };
}

// #endregion

/* This library is originated from temp.js at http://github.com/bruce/node-temp */
import fs from './fs';
import os from 'os';
import nodePath from 'path';
import cnst from 'constants';
import log from './logger';

const RDWR_EXCL = cnst.O_CREAT | cnst.O_TRUNC | cnst.O_RDWR | cnst.O_EXCL;

/**
 * Generate a temporary directory in os.tempdir() or process.env.APPIUM_TMP_DIR.
 * e.g.
 * - No `process.env.APPIUM_TMP_DIR`: `/var/folders/34/2222sh8n27d6rcp7jqlkw8km0000gn/T/xxxxxxxx.yyyy`
 * - With `process.env.APPIUM_TMP_DIR = '/path/to/root'`: `/path/to/root/xxxxxxxx.yyyy`
 *
 * @returns {Promise<string>} A path to the temporary directory
 */
async function tempDir() {
  const now = new Date();
  const filePath = nodePath.join(
    process.env.APPIUM_TMP_DIR || os.tmpdir(),
    [
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      '-',
      process.pid,
      '-',
      (Math.random() * 0x100000000 + 1).toString(36),
    ].join('')
  );
  // creates a temp directory using the date and a random string

  await fs.mkdir(filePath);

  return filePath;
}

/**
 * @typedef Affixes
 * @property {string} [prefix] - prefix of the temp directory name
 * @property {string} [suffix] - suffix of the temp directory name
 */

/**
 * Generate a temporary directory in os.tempdir() or process.env.APPIUM_TMP_DIR
 * with arbitrary prefix/suffix for the directory name.
 *
 * @param {string|Affixes} rawAffixes
 * @param {string} [defaultPrefix]
 * @returns {Promise<string>}  A path to the temporary directory with rawAffixes and defaultPrefix
 */
async function path(rawAffixes, defaultPrefix) {
  const affixes = parseAffixes(rawAffixes, defaultPrefix);
  const name = `${affixes.prefix || ''}${affixes.suffix || ''}`;
  const tempDirectory = await tempDir();
  return nodePath.join(tempDirectory, name);
}

/**
 * @typedef OpenedAffixes
 * @property {string} path - The path to file
 * @property {number} fd - The file descriptor opened
 */

/**
 * Generate a temporary directory in os.tempdir() or process.env.APPIUM_TMP_DIR
 * with arbitrary prefix/suffix for the directory name and return it as open.
 *
 * @param {Affixes} affixes
 * @returns {Promise<OpenedAffixes>}
 */
async function open(affixes) {
  const filePath = await path(affixes, 'f-');
  try {
    let fd = await fs.open(filePath, RDWR_EXCL, 0o600);
    // opens the file in mode 384
    return {path: filePath, fd};
  } catch (err) {
    throw log.errorWithException(err);
  }
}

/**
 *
 * Returns prefix/suffix object
 *
 * @param {string|Affixes} rawAffixes
 * @param {string} [defaultPrefix]
 * @returns {Affixes}
 */
function parseAffixes(rawAffixes, defaultPrefix) {
  /** @type {Affixes} */
  let affixes = {};
  if (rawAffixes) {
    switch (typeof rawAffixes) {
      case 'string':
        affixes.prefix = rawAffixes;
        break;
      case 'object':
        affixes = rawAffixes;
        break;
      default:
        throw new Error(`Unknown affix declaration: ${affixes}`);
    }
  } else {
    affixes.prefix = defaultPrefix;
  }
  return affixes;
}

const _static = tempDir();

/**
 * Returns a new path to a temporary directory
 *
 * @returns {string} A new tempDir() if tempRootDirectory is not provided
 */
const openDir = tempDir;

/**
 * Returns a path to a temporary directory whcih is defined as static in the same process
 *
 * @returns {Promise<string>} A temp directory path whcih is defined as static in the same process
 */
// eslint-disable-next-line require-await
async function staticDir() {
  return _static;
}

export {open, path, openDir, staticDir};

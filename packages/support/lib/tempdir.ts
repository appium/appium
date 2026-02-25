/* This library is originated from temp.js at http://github.com/bruce/node-temp */
import {fs} from './fs';
import os from 'node:os';
import nodePath from 'node:path';
import _ from 'lodash';
import {constants} from 'node:fs';
import log from './logger';

const RDWR_EXCL = constants.O_CREAT | constants.O_TRUNC | constants.O_RDWR | constants.O_EXCL;

/** Prefix/suffix for temp directory or file names */
export interface Affixes {
  prefix?: string;
  suffix?: string;
}

/** Result of opening a temp file */
export interface OpenedAffixes {
  path: string;
  fd: number;
}

/**
 * Generate a temporary directory with arbitrary prefix/suffix for the directory name.
 *
 * @param rawAffixes - Prefix string, or object with prefix/suffix, or omitted.
 * @param defaultPrefix - Default prefix when rawAffixes is omitted.
 * @returns A path to the temporary directory.
 */
export async function path(
  rawAffixes?: string | Affixes,
  defaultPrefix?: string
): Promise<string> {
  const affixes = parseAffixes(rawAffixes, defaultPrefix);
  const name = `${affixes.prefix ?? ''}${affixes.suffix ?? ''}`;
  const tempDirectory = await tempDir();
  return nodePath.join(tempDirectory, name);
}

/**
 * Generate a temp file path with prefix/suffix, open the file, and return path and fd.
 *
 * @param affixes - Prefix/suffix for the file name.
 * @returns The opened file path and descriptor.
 */
export async function open(affixes: Affixes): Promise<OpenedAffixes> {
  const filePath = await path(affixes, 'f-');
  try {
    const fd = await fs.open(filePath, RDWR_EXCL, 0o600);
    return {path: filePath, fd};
  } catch (err) {
    throw log.errorWithException(err as Error);
  }
}

/** Returns a new path to a temporary directory (alias for the tempDir implementation). */
export const openDir = tempDir;

/**
 * Returns a path to a temporary directory which is reused for the life of the process.
 *
 * @returns The same temp directory path on every call.
 */
export const staticDir = _.memoize(async function staticDir (): Promise<string> {
  return tempDir();
});

// #region Private

/**
 * Generate a temporary directory in os.tmpdir() or process.env.APPIUM_TMP_DIR.
 */
async function tempDir(): Promise<string> {
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

  await fs.mkdir(filePath, {recursive: true});

  return filePath;
}

function parseAffixes(
  rawAffixes?: string | Affixes,
  defaultPrefix?: string
): Affixes {
  let affixes: Affixes = {};
  if (rawAffixes !== undefined && rawAffixes !== null) {
    switch (typeof rawAffixes) {
      case 'string':
        affixes = {prefix: rawAffixes};
        break;
      case 'object':
        affixes = rawAffixes;
        break;
      default:
        throw new Error(`Unknown affix declaration: ${String(rawAffixes)}`);
    }
  } else {
    affixes.prefix = defaultPrefix;
  }
  return affixes;
}

// #endregion

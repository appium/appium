import os from 'node:os';

import {exec} from 'teen_process';

/**
 * Whether the current OS is Windows.
 */
export function isWindows(): boolean {
  return os.type() === 'Windows_NT';
}

/**
 * Whether the current OS is macOS (Darwin).
 */
export function isMac(): boolean {
  return os.type() === 'Darwin';
}

/**
 * Whether the current OS is Linux (i.e. not Windows and not macOS).
 */
export function isLinux(): boolean {
  return !isWindows() && !isMac();
}

/**
 * Whether the current Windows process is 64-bit (or WOW64).
 */
export function isOSWin64(): boolean {
  return process.arch === 'x64' || Object.hasOwn(process.env, 'PROCESSOR_ARCHITEW6432');
}

/**
 * System detection helpers (platform, architecture).
 * Use this object when you need `arch()` to call other helpers via `this` (e.g. for testing).
 */
export const system: System = {
  isWindows,
  isMac,
  isLinux,
  isOSWin64,
  arch: archImpl,
};

/**
 * Resolves the process architecture as `'32'` or `'64'` (uname on Unix, process.arch/env on Windows).
 */
export const arch = system.arch;

// #region Private

interface System {
  isWindows(): boolean;
  isMac(): boolean;
  isLinux(): boolean;
  isOSWin64(): boolean;
  arch(): Promise<string>;
}

async function archImpl(this: System): Promise<string> {
  if (this.isLinux() || this.isMac()) {
    const {stdout} = await exec('uname', ['-m']);
    return stdout.trim() === 'i686' ? '32' : '64';
  } else if (this.isWindows()) {
    return this.isOSWin64() ? '64' : '32';
  }
  return '64';
}

// #endregion

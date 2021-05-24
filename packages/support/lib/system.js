import { exec } from 'teen_process';
import _ from 'lodash';
import os from 'os';

const VERSION_PATTERN = /^(\d+\.\d+)/m;

function isWindows () {
  return os.type() === 'Windows_NT';
}

function isMac () {
  return os.type() === 'Darwin';
}

function isLinux () {
  return !isWindows() && !isMac();
}

function isOSWin64 () {
  return process.arch === 'x64' || _.has(process.env, 'PROCESSOR_ARCHITEW6432');
}

async function arch () {
  if (isLinux() || isMac()) {
    let {stdout} = await exec('uname', ['-m']);
    return stdout.trim() === 'i686' ? '32' : '64';
  } else if (isWindows()) {
    let is64 = this.isOSWin64();
    return is64 ? '64' : '32';
  }
}

async function macOsxVersion () {
  let stdout;
  try {
    stdout = (await exec('sw_vers', ['-productVersion'])).stdout.trim();
  } catch (err) {
    throw new Error(`Could not detect Mac OS X Version: ${err}`);
  }

  const versionMatch = VERSION_PATTERN.exec(stdout);
  if (!versionMatch) {
    throw new Error(`Could not detect Mac OS X Version from sw_vers output: '${stdout}'`);
  }
  return versionMatch[1];
}

export { isWindows, isMac, isLinux, isOSWin64, arch, macOsxVersion };

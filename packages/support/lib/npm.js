// @ts-check

import path from 'path';
import semver from 'semver';
import { hasAppiumDependency } from './env';
import { exec } from 'teen_process';
import { fs } from './fs';
import * as util from './util';
import * as system from './system';
import resolveFrom from 'resolve-from';


/**
 * Relative path to directory containing any Appium internal files
 * XXX: this is duplicated in `appium/lib/constants.js`.
 */
export const CACHE_DIR_RELATIVE_PATH = path.join(
  'node_modules',
  '.cache',
  'appium',
);

/**
 * Relative path to lockfile used when installing an extension via `appium`
 */
export const INSTALL_LOCKFILE_RELATIVE_PATH = path.join(
  CACHE_DIR_RELATIVE_PATH,
  '.install.lock',
);

/**
 * XXX: This should probably be a singleton, but it isn't.  Maybe this module should just export functions?
 */
export class NPM {
  /**
   * Returns path to "install" lockfile
   * @private
   * @param {string} cwd
   */
  _getInstallLockfilePath (cwd) {
    return path.join(cwd, INSTALL_LOCKFILE_RELATIVE_PATH);
  }

  /**
   * Execute `npm` with given args.
   *
   * If the process exits with a nonzero code, the contents of `STDOUT` and `STDERR` will be in the
   * `message` of the {@link TeenProcessExecError} rejected.
   * @param {string} cmd
   * @param {string[]} args
   * @param {ExecOpts} opts
   * @param {ExecOpts} [execOpts]
   */
  async exec (cmd, args, opts, execOpts = /** @type {ExecOpts} */({})) {
    let { cwd, json, lockFile } = opts;

    // make sure we perform the current operation in cwd
    execOpts = {...execOpts, cwd};

    args.unshift(cmd);
    if (json) {
      args.push('--json');
    }
    const npmCmd = system.isWindows() ? 'npm.cmd' : 'npm';
    let runner = async () => await exec(npmCmd, args, execOpts);
    if (lockFile) {
      const acquireLock = util.getLockFileGuard(lockFile);
      const _runner = runner;
      runner = async () => await acquireLock(_runner);
    }

    /** @type {import('teen_process').ExecResult<string> & {json?: any}} */
    let ret;
    try {
      const {stdout, stderr, code} = await runner();
      ret = {stdout, stderr, code};
      // if possible, parse NPM's json output. During NPM install 3rd-party
      // packages can write to stdout, so sometimes the json output can't be
      // guaranteed to be parseable
      try {
        ret.json = JSON.parse(stdout);
      } catch (ign) {}
    } catch (e) {
      const {stdout = '', stderr = '', code = null} = /** @type {TeenProcessExecError} */(e);
      const err = new Error(`npm command '${args.join(' ')}' failed with code ${code}.\n\nSTDOUT:\n${stdout.trim()}\n\nSTDERR:\n${stderr.trim()}`);
      throw err;
    }
    return ret;
  }

  /**
   * @param {string} cwd
   * @param {string} pkg
   */
  async getLatestVersion (cwd, pkg) {
    return (await this.exec('view', [pkg, 'dist-tags'], {
      json: true,
      cwd
    })).json?.latest;
  }

  /**
   * @param {string} cwd
   * @param {string} pkg
   * @param {string} curVersion
   */
  async getLatestSafeUpgradeVersion (cwd, pkg, curVersion) {
    const allVersions = (await this.exec('view', [pkg, 'versions'], {
      json: true,
      cwd
    })).json;
    return this.getLatestSafeUpgradeFromVersions(curVersion, allVersions);
  }

  /**
   * Runs `npm ls`, optionally for a particular package.
   * @param {string} cwd
   * @param {string} [pkg]
   */
  async list (cwd, pkg) {
    return (await this.exec('list', pkg ? [pkg] : [], {cwd, json: true})).json;
  }

  /**
   * Given a current version and a list of all versions for a package, return the version which is
   * the highest safely-upgradable version (meaning not crossing any major revision boundaries, and
   * not including any alpha/beta/rc versions)
   *
   * @param {string} curVersion - the current version of a package
   * @param {Array<string>} allVersions - a list of version strings
   *
   * @return {string|null} - the highest safely-upgradable version, or null if there isn't one
   */
  getLatestSafeUpgradeFromVersions (curVersion, allVersions) {
    let safeUpgradeVer = null;
    const curSemver = semver.parse(curVersion);
    if (curSemver === null) {
      throw new Error(`Could not parse current version '${curVersion}'`);
    }
    for (const testVer of allVersions) {
      const testSemver = semver.parse(testVer);
      if (testSemver === null) {
        throw new Error(`Could not parse version to test against: '${testVer}'`);
      }
      // if the test version is a prerelease, ignore it
      if (testSemver.prerelease.length > 0) {
        continue;
      }
      // if the current version is later than the test version, skip this test version
      if (curSemver.compare(testSemver) === 1) {
        continue;
      }
      // if the test version is newer, but crosses a major revision boundary, also skip it
      if (testSemver.major > curSemver.major) {
        continue;
      }
      // otherwise this version is safe to upgrade to. But there might be multiple ones of this
      // kind, so keep iterating and keeping the highest
      if (safeUpgradeVer === null || testSemver.compare(safeUpgradeVer) === 1) {
        safeUpgradeVer = testSemver;
      }
    }
    if (safeUpgradeVer) {
      safeUpgradeVer = safeUpgradeVer.format();
    }
    return safeUpgradeVer;
  }

  /**
   * Installs a package w/ `npm`
   * @param {string} cwd
   * @param {string} pkgName
   * @param {InstallPackageOpts} [opts]
   * @returns {Promise<import('type-fest').PackageJson>}
   */
  async installPackage (cwd, pkgName, {pkgVer} = {}) {
    /** @type {any} */
    let dummyPkgJson;
    const dummyPkgPath = path.join(cwd, 'package.json');
    try {
      dummyPkgJson = JSON.parse(await fs.readFile(dummyPkgPath, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') {
        dummyPkgJson = {};
        await fs.writeFile(dummyPkgPath, JSON.stringify(dummyPkgJson, null, 2), 'utf8');
      } else {
        throw err;
      }
    }

    /**
     * If we've found a `package.json` containined the `appiumCreated` property,
     * then we can do whatever we please with it, since we created it.  This is
     * likely when `APPIUM_HOME` is the default (in `~/.appium`).  In that case,
     * we want `--global-style` to avoid deduping, and we also do not need a
     * `package-lock.json`.
     *
     * If we _haven't_ found such a key, then this `package.json` isn't a
     * "dummy" and is controlled by the user.  So we'll just add it as a dev
     * dep; whatever else it does is up to the user's npm config.
     */
    const installOpts = await hasAppiumDependency(cwd) ?
      ['--save-dev'] :
      ['--save-dev', '--save-exact', '--global-style', '--no-package-lock'];

    const res = await this.exec('install', [
      ...installOpts,
      pkgVer ? `${pkgName}@${pkgVer}` : pkgName
    ], {
      cwd,
      json: true,
      lockFile: this._getInstallLockfilePath(cwd)
    });

    if (res.json) {
      // we parsed a valid json response, so if we got an error here, return that
      // message straightaway
      if (res.json.error) {
        throw new Error(res.json.error);
      }
    }

    // Now read package data from the installed package to return, and make sure
    // everything got installed ok. Remember, pkgName might end up with a / in it due to an npm
    // org, so if so, that will get correctly exploded into multiple directories, by path.resolve here
    // (even on Windows!)
    const pkgJsonPath = resolveFrom(cwd, `${pkgName}/package.json`);
    try {
      return require(pkgJsonPath);
    } catch {
      throw new Error('The package was not downloaded correctly; its package.json ' +
                      'did not exist or was unreadable. We looked for it at ' +
                      pkgJsonPath);
    }
  }

  /**
   * @param {string} cwd
   * @param {string} pkg
   */
  async uninstallPackage (cwd, pkg) {
    await this.exec('uninstall', [pkg], {
      cwd,
      lockFile: this._getInstallLockfilePath(cwd)
    });
  }
}

export const npm = new NPM();

/**
 * Options for {@link NPM.installPackage}
 * @typedef InstallPackageOpts
 * @property {string} [pkgVer] - the version of the package to install
 */

/**
 * Options for {@link NPM.exec}
 * @typedef ExecOpts
 * @property {string} cwd - Current working directory
 * @property {boolean} [json] - If `true`, supply `--json` flag to npm and resolve w/ parsed JSON
 * @property {string} [lockFile] - Path to lockfile to use
 */

// THESE TYPES SHOULD BE IN TEEN PROCESS, NOT HERE

/**
 * Extra props `teen_process.exec` adds to its error objects
 * @typedef TeenProcessExecErrorProps
 * @property {string} stdout - STDOUT
 * @property {string} stderr - STDERR
 * @property {number?} code - Exit code
 */

/**
 * Error thrown by `teen_process.exec`
 * @typedef {Error & TeenProcessExecErrorProps} TeenProcessExecError
 */

// @ts-check

import path from 'path';
import semver from 'semver';
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
 * Relative path to lockfile used when linking an extension via `appium`
 */
export const LINK_LOCKFILE_RELATIVE_PATH = path.join(
  CACHE_DIR_RELATIVE_PATH,
  '.link.lock',
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
   * Returns path to "link" lockfile
   * @private
   * @param {string} cwd
   */
  _getLinkLockfilePath (cwd) {
    return path.join(cwd, LINK_LOCKFILE_RELATIVE_PATH);
  }

  /**
   * Execute `npm` with given args.
   *
   * If the process exits with a nonzero code, the contents of `STDOUT` and `STDERR` will be in the
   * `message` of the {@link TeenProcessExecError} rejected.
   * @param {string} cmd
   * @param {string[]} args
   * @param {ExecOpts} opts
   * @param {TeenProcessExecOpts} [execOpts]
   */
  async exec (cmd, args, opts, execOpts = {}) {
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

    let ret;
    try {
      const {stdout, stderr, code} = await runner();
      ret = /** @type {TeenProcessExecResult} */({stdout, stderr, code});
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
    // not only this, this directory needs a 'package.json' inside of it, otherwise, if any
    // directory in the filesystem tree ABOVE cwd happens to have a package.json or a node_modules
    // dir in it, NPM will install the module up there instead (silly NPM)
    const dummyPkgJson = path.resolve(cwd, 'package.json');
    if (!await fs.exists(dummyPkgJson)) {
      await fs.writeFile(dummyPkgJson, '{}');
    }

    const res = await this.exec('install', [
      '--no-save',
      '--global-style',
      '--no-package-lock',
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
   * @todo: I think this can be an `install` instead of a `link`.
   * @param {string} cwd
   * @param {string} pkgPath
   */
  async linkPackage (cwd, pkgPath) {
    // from the path alone we don't know the npm package name, so we need to
    // look in package.json
    let pkgName;
    try {
      pkgName = require(path.resolve(pkgPath, 'package.json')).name;
    } catch {
      throw new Error('Could not find package.json inside the package path ' +
                      `provided: ${pkgPath}`);
    }

    // this is added to handle commands with relative paths
    // ie: "node . driver install --source=local ../fake-driver"
    pkgPath = path.resolve(process.cwd(), pkgPath);

    // call link with --no-package-lock to ensure no corruption while installing local packages
    const args = [
      '--global-style',
      '--no-package-lock',
      pkgPath
    ];
    const res = await this.exec('link', args, {cwd, lockFile: this._getLinkLockfilePath(cwd)});
    if (res.json && res.json.error) {
      throw new Error(res.json.error);
    }

    // now ensure it was linked to the correct place
    try {
      return require(resolveFrom(cwd, `${pkgName}/package.json`));
    } catch {
      throw new Error('The package was not linked correctly; its package.json ' +
                      'did not exist or was unreadable');
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
 * Result from a non-zero-exit execution of `appium`
 * @typedef TeenProcessExecResult
 * @property {string} stdout - Stdout
 * @property {string} stderr - Stderr
 * @property {number?} code - Exit code
 * @property {any} json - JSON parsed from stdout
 */

/**
 * Extra props `teen_process.exec` adds to its error objects
 * @typedef TeenProcessExecErrorProps
 * @property {string} stdout - STDOUT
 * @property {string} stderr - STDERR
 * @property {number?} code - Exit code
 */

/**
 * Options unique to `teen_process.exec`. I probably missed some
 * @typedef TeenProcessExecExtraOpts
 * @property {number} [maxStdoutBufferSize]
 * @property {number} [maxStderrBufferSize]
 */

/**
 * All options for `teen_process.exec`
 * @typedef {import('child_process').SpawnOptions & TeenProcessExecExtraOpts} TeenProcessExecOpts
 */

/**
 * Error thrown by `teen_process.exec`
 * @typedef {Error & TeenProcessExecErrorProps} TeenProcessExecError
 */

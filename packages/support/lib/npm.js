// @ts-check

import path from 'path';
import * as semver from 'semver';
import {hasAppiumDependency} from './env';
import {exec} from 'teen_process';
import {fs} from './fs';
import * as util from './util';
import * as system from './system';
import resolveFrom from 'resolve-from';

/**
 * Relative path to directory containing any Appium internal files
 * XXX: this is duplicated in `appium/lib/constants.js`.
 */
export const CACHE_DIR_RELATIVE_PATH = path.join('node_modules', '.cache', 'appium');

/**
 * Relative path to lockfile used when installing an extension via `appium`
 */
export const INSTALL_LOCKFILE_RELATIVE_PATH = path.join(CACHE_DIR_RELATIVE_PATH, '.install.lock');

/**
 * XXX: This should probably be a singleton, but it isn't.  Maybe this module should just export functions?
 */
export class NPM {
  /**
   * Returns path to "install" lockfile
   * @private
   * @param {string} cwd
   */
  _getInstallLockfilePath(cwd) {
    return path.join(cwd, INSTALL_LOCKFILE_RELATIVE_PATH);
  }

  /**
   * Execute `npm` with given args.
   *
   * If the process exits with a nonzero code, the contents of `STDOUT` and `STDERR` will be in the
   * `message` of any rejected error.
   * @param {string} cmd
   * @param {string[]} args
   * @param {ExecOpts} opts
   * @param {Omit<TeenProcessExecOptions, 'cwd'>} [execOpts]
   */
  async exec(cmd, args, opts, execOpts = {}) {
    const {cwd, json, lockFile} = opts;

    // make sure we perform the current operation in cwd
    /** @type {TeenProcessExecOptions} */
    const teenProcessExecOpts = {
      ...execOpts,
      // https://github.com/nodejs/node/issues/52572
      shell: system.isWindows() || execOpts.shell,
      cwd,
    };

    args.unshift(cmd);
    if (json) {
      args.push('--json');
    }
    const npmCmd = system.isWindows() ? 'npm.cmd' : 'npm';
    let runner = async () => await exec(npmCmd, args, teenProcessExecOpts);
    if (lockFile) {
      const acquireLock = util.getLockFileGuard(lockFile);
      const _runner = runner;
      runner = async () => await acquireLock(_runner);
    }

    /** @type {import('teen_process').TeenProcessExecResult<string> & {json?: any}} */
    let ret;
    try {
      const {stdout, stderr, code} = await runner();
      ret = {stdout, stderr, code};
      // if possible, parse NPM's json output. During NPM install 3rd-party
      // packages can write to stdout, so sometimes the json output can't be
      // guaranteed to be parseable
      try {
        ret.json = JSON.parse(stdout);
      } catch {}
    } catch (e) {
      const {
        stdout = '',
        stderr = '',
        code = null,
      } = /** @type {import('teen_process').ExecError} */ (e);
      const err = new Error(
        `npm command '${args.join(
          ' '
        )}' failed with code ${code}.\n\nSTDOUT:\n${stdout.trim()}\n\nSTDERR:\n${stderr.trim()}`
      );
      throw err;
    }
    return ret;
  }

  /**
   * @param {string} cwd
   * @param {string} pkg
   * @returns {Promise<string?>}
   */
  async getLatestVersion(cwd, pkg) {
    try {
      return (
        (
          await this.exec('view', [pkg, 'dist-tags'], {
            json: true,
            cwd,
          })
        ).json?.latest ?? null
      );
    } catch (err) {
      if (!err?.message.includes('E404')) {
        throw err;
      }
      return null;
    }
  }

  /**
   * @param {string} cwd
   * @param {string} pkg
   * @param {string} curVersion
   * @returns {Promise<string?>}
   */
  async getLatestSafeUpgradeVersion(cwd, pkg, curVersion) {
    try {
      const allVersions = (
        await this.exec('view', [pkg, 'versions'], {
          json: true,
          cwd,
        })
      ).json;
      return this.getLatestSafeUpgradeFromVersions(curVersion, allVersions);
    } catch (err) {
      if (!err?.message.includes('E404')) {
        throw err;
      }
      return null;
    }
  }

  /**
   * Runs `npm ls`, optionally for a particular package.
   * @param {string} cwd
   * @param {string} [pkg]
   */
  async list(cwd, pkg) {
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
  getLatestSafeUpgradeFromVersions(curVersion, allVersions) {
    let safeUpgradeVer = null;
    const curSemver = semver.parse(curVersion) ?? semver.parse(semver.coerce(curVersion));
    if (curSemver === null) {
      throw new Error(`Could not parse current version '${curVersion}'`);
    }
    for (const testVer of allVersions) {
      const testSemver = semver.parse(testVer) ?? semver.parse(semver.coerce(testVer));
      if (testSemver === null) {
        continue;
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
   * @param {string} installStr - as in "npm install <installStr>"
   * @param {InstallPackageOpts} opts
   * @returns {Promise<NpmInstallReceipt>}
   */
  async installPackage(cwd, installStr, {pkgName, installType}) {
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

    const installOpts = ['--save-dev', '--no-progress', '--no-audit'];
    if (!(await hasAppiumDependency(cwd))) {
      if (process.env.APPIUM_OMIT_PEER_DEPS) {
        installOpts.push('--omit=peer');
      }
      installOpts.push('--save-exact', '--global-style', '--no-package-lock');
    }

    const cmd = installType === 'local' ? 'link' : 'install';
    const res = await this.exec(cmd, [...installOpts, installStr], {
      cwd,
      json: true,
      lockFile: this._getInstallLockfilePath(cwd),
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
      const pkgJson = await fs.readFile(pkgJsonPath, 'utf8');
      const pkg = JSON.parse(pkgJson);
      return {installPath: path.dirname(pkgJsonPath), pkg};
    } catch {
      throw new Error(
        'The package was not downloaded correctly; its package.json ' +
          'did not exist or was unreadable. We looked for it at ' +
          pkgJsonPath
      );
    }
  }

  /**
   * @param {string} cwd
   * @param {string} pkg
   */
  async uninstallPackage(cwd, pkg) {
    await this.exec('uninstall', [pkg], {
      cwd,
      lockFile: this._getInstallLockfilePath(cwd),
    });
  }

  /**
   * @param {string} pkg Npm package spec to query
   * @param {string[]} [entries=[]] Field names to be included into the
   * resulting output. By default all fields are included.
   * @returns {Promise<import('@appium/types').StringRecord>}
   */
  async getPackageInfo(pkg, entries = []) {
    return (await this.exec('info', [pkg, ...entries], {
      cwd: process.cwd(),
      json: true,
    })).json;
  }
}

export const npm = new NPM();

/**
 * Options for {@link NPM.installPackage}
 * @typedef InstallPackageOpts
 * @property {string} pkgName - the name of the package to install
 * @property {import('type-fest').LiteralUnion<'local', string>} [installType] - whether to install from a local path or from npm
 */

/**
 * Options for {@link NPM.exec}
 * @typedef ExecOpts
 * @property {string} cwd - Current working directory
 * @property {boolean} [json] - If `true`, supply `--json` flag to npm and resolve w/ parsed JSON
 * @property {string} [lockFile] - Path to lockfile to use
 */

/**
 * @typedef {import('teen_process').TeenProcessExecOptions} TeenProcessExecOptions
 */

/**
 * @typedef NpmInstallReceipt
 * @property {string} installPath - Path to installed package
 * @property {import('type-fest').PackageJson} pkg - Package data
 */

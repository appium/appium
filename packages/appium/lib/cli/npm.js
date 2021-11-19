// @ts-check

import path from 'path';
import semver from 'semver';
import { exec } from 'teen_process';
import { fs, mkdirp, util, system } from '@appium/support';

const INSTALL_LOCKFILE = '.appium.install.lock';
const LINK_LOCKFILE = '.appium.link.lock';

export default class NPM {

  /**
   * @param {string} appiumHome
   */
  constructor (appiumHome) {
    /** @type {string} */
    this.appiumHome = appiumHome;
  }

  /**
   * Execute `npm` with given args.
   *
   * If the process exits with a nonzero code, the contents of `STDOUT` and `STDERR` will be in the
   * `message` of the {@link TeenProcessExecError} rejected.
   * @param {string} cmd
   * @param {string[]} args
   * @param {{ json?: boolean; cwd?: string; lockFile?: string; }} opts
   */
  async exec (cmd, args, opts, execOpts = {}) {
    let { cwd, json, lockFile } = opts;
    if (!cwd) {
      cwd = this.appiumHome;
    }
    // ensure the directory we want to install inside of exists
    await mkdirp(cwd);

    // not only this, this directory needs a 'package.json' inside of it, otherwise, if any
    // directory in the filesystem tree ABOVE cwd happens to have a package.json or a node_modules
    // dir in it, NPM will install the module up there instead (silly NPM)
    const dummyPkgJson = path.resolve(cwd, 'package.json');
    if (!await fs.exists(dummyPkgJson)) {
      await fs.writeFile(dummyPkgJson, '{}');
    }

    // make sure we perform the current operation in cwd
    execOpts = {...execOpts, cwd};

    args.unshift(cmd);
    if (json) {
      args.push('--json');
    }
    const npmCmd = system.isWindows() ? 'npm.cmd' : 'npm';
    let runner = async () => await exec(npmCmd, args, execOpts);
    if (lockFile) {
      const acquireLock = util.getLockFileGuard(path.resolve(cwd, lockFile));
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
      const {stdout, stderr, code} = /** @type {TeenProcessExecError} */(e);
      const err = new Error(`npm command '${cmd} ${args.join(' ')}' failed with code ${code}.\n\nSTDOUT:\n${stdout.trim()}\n\nSTDERR:\n${stderr.trim()}`);
      throw err;
    }
    return ret;
  }

  /**
   * @param {string} pkg
   */
  async getLatestVersion (pkg) {
    return (await this.exec('view', [pkg, 'dist-tags'], {
      json: true
    })).json?.latest;
  }

  /**
   * @param {string} pkg
   * @param {string} curVersion
   */
  async getLatestSafeUpgradeVersion (pkg, curVersion) {
    const allVersions = (await this.exec('view', [pkg, 'versions'], {
      json: true
    })).json;
    return this.getLatestSafeUpgradeFromVersions(curVersion, allVersions);
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
   *
   * @param {{pkgDir: string, pkgName: string, pkgVer?: string}} param0
   * @returns {Promise<import('type-fest').PackageJson>}
   */
  async installPackage ({pkgDir, pkgName, pkgVer}) {
    const res = await this.exec('install', [
      '--no-save',
      '--no-package-lock',
      pkgVer ? `${pkgName}@${pkgVer}` : pkgName
    ], {
      cwd: pkgDir,
      json: true,
      lockFile: INSTALL_LOCKFILE
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
    const pkgJson = path.resolve(pkgDir, 'node_modules', pkgName, 'package.json');
    try {
      return require(pkgJson);
    } catch {
      throw new Error('The package was not downloaded correctly; its package.json ' +
                      'did not exist or was unreadable. We looked for it at ' +
                      pkgJson);
    }
  }

  /**
   * @param {string} pkgPath
   */
  async linkPackage (pkgPath) {
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

    const pkgHome = path.resolve(this.appiumHome, pkgName);

    // call link with --no-package-lock to ensure no corruption while installing local packages
    const res = await this.exec('link', ['--no-package-lock', pkgPath], {cwd: pkgHome, lockFile: LINK_LOCKFILE});
    if (res.json && res.json.error) {
      throw new Error(res.json.error);
    }

    // now ensure it was linked to the correct place
    try {
      return require(path.resolve(pkgHome, 'node_modules', pkgName, 'package.json'));
    } catch {
      throw new Error('The package was not linked correctly; its package.json ' +
                      'did not exist or was unreadable');
    }
  }

  /**
   * @param {string} pkgDir
   * @param {string} pkg
   */
  async uninstallPackage (pkgDir, pkg) {
    await this.exec('uninstall', [pkg], {
      cwd: pkgDir,
      lockFile: INSTALL_LOCKFILE
    });
  }
}


/**
 * Result from a non-zero-exit execution of `appium`
 * @typedef {Object} TeenProcessExecResult
 * @property {string} stdout - Stdout
 * @property {string} stderr - Stderr
 * @property {number?} code - Exit code
 * @property {any} json - JSON parsed from stdout
 */

/**
 * Extra props `teen_process.exec` adds to its error objects
 * @typedef {Object} TeenProcessExecErrorProps
 * @property {string} stdout - STDOUT
 * @property {string} stderr - STDERR
 * @property {number?} code - Exit code
 */


/**
 * Error thrown by `teen_process.exec`
 * @typedef {Error & TeenProcessExecErrorProps} TeenProcessExecError
 */

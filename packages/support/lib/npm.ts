import path from 'node:path';
import * as semver from 'semver';
import type {PackageJson} from 'type-fest';
import type {StringRecord} from '@appium/types';
import {hasAppiumDependency} from './env';
import {exec} from 'teen_process';
import type {ExecError, TeenProcessExecOptions} from 'teen_process';
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

/** Options for {@link NPM.exec} */
export interface ExecOpts {
  /** Current working directory */
  cwd: string;
  /** If true, supply `--json` flag to npm and resolve w/ parsed JSON */
  json?: boolean;
  /** Path to lockfile to use */
  lockFile?: string;
}

/** Options for {@link NPM.installPackage} */
export interface InstallPackageOpts {
  /** Name of the package to install */
  pkgName: string;
  /** Whether to install from a local path or from npm */
  installType?: 'local' | string;
}

/** Result of {@link NPM.installPackage} */
export interface NpmInstallReceipt {
  /** Path to installed package */
  installPath: string;
  /** Package data */
  pkg: PackageJson;
}

export interface NpmExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
  json?: unknown;
}

/**
 * XXX: This should probably be a singleton, but it isn't.  Maybe this module should just export functions?
 */
export class NPM {
  /**
   * Execute `npm` with given args.
   *
   * If the process exits with a nonzero code, the contents of `STDOUT` and `STDERR` will be in the
   * `message` of any rejected error.
   */
  async exec(
    cmd: string,
    args: string[],
    opts: ExecOpts,
    execOpts: Omit<TeenProcessExecOptions, 'cwd'> = {}
  ): Promise<NpmExecResult> {
    const {cwd, json, lockFile} = opts;

    const teenProcessExecOpts: TeenProcessExecOptions = {
      ...execOpts,
      shell: system.isWindows() || execOpts.shell,
      cwd,
    };

    const argsCopy = [cmd, ...args];
    if (json) {
      argsCopy.push('--json');
    }
    const npmCmd = system.isWindows() ? 'npm.cmd' : 'npm';
    type ExecRunnerResult = {stdout: string; stderr: string; code: number | null};
    let runner = async (): Promise<ExecRunnerResult> =>
      await exec(npmCmd, argsCopy, teenProcessExecOpts);
    if (lockFile) {
      const acquireLock = util.getLockFileGuard(lockFile);
      const _runner = runner;
      runner = async () => (await acquireLock(_runner)) as ExecRunnerResult;
    }

    let ret: NpmExecResult;
    try {
      const {stdout, stderr, code} = await runner();
      ret = {stdout, stderr, code};
      try {
        ret.json = JSON.parse(stdout);
      } catch {
        // ignore
      }
    } catch (e) {
      const {stdout = '', stderr = '', code = null} = e as ExecError;
      throw new Error(
        `npm command '${argsCopy.join(' ')}' failed with code ${code}.\n\nSTDOUT:\n${stdout.trim()}\n\nSTDERR:\n${stderr.trim()}`
      );
    }
    return ret;
  }

  /**
   * Gets the latest published version of a package from npm registry.
   *
   * @param cwd - Current working directory for npm command
   * @param pkg - Package name to query
   * @returns Latest version string, or `null` if package not found (e.g. 404)
   */
  async getLatestVersion(cwd: string, pkg: string): Promise<string | null> {
    try {
      const result = await this.exec('view', [pkg, 'dist-tags'], {json: true, cwd});
      const json = result.json as {latest?: string} | undefined;
      return json?.latest ?? null;
    } catch (err) {
      if (!(err instanceof Error) || !err.message.includes('E404')) {
        throw err;
      }
      return null;
    }
  }

  /**
   * Gets the latest version of a package that is a safe upgrade from the current version
   * (same major, no prereleases). Fetches versions from npm and delegates to
   * {@link NPM.getLatestSafeUpgradeFromVersions}.
   *
   * @param cwd - Current working directory for npm command
   * @param pkg - Package name to query
   * @param curVersion - Current installed version
   * @returns Latest safe upgrade version string, or `null` if none or package not found
   */
  async getLatestSafeUpgradeVersion(
    cwd: string,
    pkg: string,
    curVersion: string
  ): Promise<string | null> {
    try {
      const result = await this.exec('view', [pkg, 'versions'], {json: true, cwd});
      const allVersions = result.json;
      if (!Array.isArray(allVersions)) {
        return null;
      }
      return this.getLatestSafeUpgradeFromVersions(curVersion, allVersions as string[]);
    } catch (err) {
      if (!(err instanceof Error) || !err.message.includes('E404')) {
        throw err;
      }
      return null;
    }
  }

  /**
   * Runs `npm ls`, optionally for a particular package.
   */
  async list(cwd: string, pkg?: string): Promise<unknown> {
    return (await this.exec('list', pkg ? [pkg] : [], {cwd, json: true})).json;
  }

  /**
   * Given a current version and a list of all versions for a package, return the version which is
   * the highest safely-upgradable version (meaning not crossing any major revision boundaries, and
   * not including any alpha/beta/rc versions)
   */
  getLatestSafeUpgradeFromVersions(
    curVersion: string,
    allVersions: string[]
  ): string | null {
    let safeUpgradeVer: semver.SemVer | null = null;
    const curSemver = semver.parse(curVersion) ?? semver.parse(semver.coerce(curVersion));
    if (curSemver === null) {
      throw new Error(`Could not parse current version '${curVersion}'`);
    }
    for (const testVer of allVersions) {
      const testSemver = semver.parse(testVer) ?? semver.parse(semver.coerce(testVer));
      if (
        testSemver === null ||
        testSemver.prerelease.length > 0 ||
        curSemver.compare(testSemver) === 1 ||
        testSemver.major > curSemver.major
      ) {
        continue;
      }
      if (safeUpgradeVer === null || testSemver.compare(safeUpgradeVer) === 1) {
        safeUpgradeVer = testSemver;
      }
    }
    return safeUpgradeVer ? safeUpgradeVer.format() : null;
  }

  /**
   * Installs a package w/ `npm`
   */
  async installPackage(
    cwd: string,
    installStr: string,
    opts: InstallPackageOpts
  ): Promise<NpmInstallReceipt> {
    const {pkgName, installType} = opts;
    let dummyPkgJson: Record<string, unknown>;
    const dummyPkgPath = path.join(cwd, 'package.json');
    try {
      dummyPkgJson = JSON.parse(await fs.readFile(dummyPkgPath, 'utf8')) as Record<string, unknown>;
    } catch (err) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
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

    if (res.json && typeof res.json === 'object' && 'error' in res.json && res.json.error) {
      throw new Error(String((res.json as {error: unknown}).error));
    }

    const pkgJsonPath = resolveFrom(cwd, `${pkgName}/package.json`);
    try {
      const pkgJson = await fs.readFile(pkgJsonPath, 'utf8');
      const pkg = JSON.parse(pkgJson) as PackageJson;
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
   * Uninstalls a package with `npm uninstall`.
   *
   * @param cwd - Current working directory (project root)
   * @param pkg - Package name to uninstall
   */
  async uninstallPackage(cwd: string, pkg: string): Promise<void> {
    await this.exec('uninstall', [pkg], {
      cwd,
      lockFile: this._getInstallLockfilePath(cwd),
    });
  }

  /**
   * Fetches package metadata from the npm registry via `npm info`.
   *
   * @param pkg - Npm package spec to query
   * @param entries - Field names to be included into the resulting output. By default all fields are included.
   * @returns Package metadata as a record of string values
   */
  async getPackageInfo(pkg: string, entries: string[] = []): Promise<StringRecord> {
    const result = await this.exec('info', [pkg, ...entries], {
      cwd: process.cwd(),
      json: true,
    });
    return (result.json ?? {}) as StringRecord;
  }

  /** Returns path to "install" lockfile */
  private _getInstallLockfilePath(cwd: string): string {
    return path.join(cwd, INSTALL_LOCKFILE_RELATIVE_PATH);
  }
}

export const npm = new NPM();

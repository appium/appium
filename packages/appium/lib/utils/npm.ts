import Module from 'node:module';
import path from 'node:path';

import {fs, system, util} from '@appium/support';
import type {PackageJson, StringRecord} from '@appium/types';
import * as semver from 'semver';
import {exec} from 'teen_process';
import type {ExecError, TeenProcessExecOptions} from 'teen_process';

import {INSTALL_LOCKFILE_RELATIVE_PATH} from '../constants.js';

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
  installType?: string;
  /** Whether `cwd` (or an ancestor) already declares a dependency on `appium` */
  hasAppiumDependency: boolean;
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

interface WindowsNpmCommand {
  node: string;
  cli: string;
}

export class NPM {
  private readonly _pendingWindowsNpmCli = new Map<string, Promise<WindowsNpmCommand>>();

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
    execOpts: Omit<TeenProcessExecOptions, 'cwd'> = {},
  ): Promise<NpmExecResult> {
    const {cwd, json, lockFile} = opts;
    const isWindows = system.isWindows();

    const teenProcessExecOpts: TeenProcessExecOptions = {
      ...execOpts,
      shell: isWindows ? false : execOpts.shell,
      cwd,
    };

    const argsCopy = [cmd, ...args];
    if (json) {
      argsCopy.push('--json');
    }
    let npmCmd = 'npm';
    if (isWindows) {
      const {node, cli} = await this._resolveWindowsNpmCommand(teenProcessExecOpts);
      npmCmd = node;
      argsCopy.unshift(cli);
    }
    type ExecRunnerResult = {stdout: string; stderr: string; code: number | null};
    let runner = async (): Promise<ExecRunnerResult> => await exec(npmCmd, argsCopy, teenProcessExecOpts);
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
      // oxlint-disable-next-line typescript/no-useless-default-assignment -- the process may fail before teen_process adds the streams
      const {stdout = '', stderr = '', code = null} = e as ExecError;
      throw new Error(
        `npm command '${argsCopy.join(
          ' ',
        )}' failed with code ${code}.\n\nSTDOUT:\n${stdout.trim()}\n\nSTDERR:\n${stderr.trim()}`,
        {cause: e},
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
  async getLatestSafeUpgradeVersion(cwd: string, pkg: string, curVersion: string): Promise<string | null> {
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
  getLatestSafeUpgradeFromVersions(curVersion: string, allVersions: string[]): string | null {
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
  async installPackage(cwd: string, installStr: string, opts: InstallPackageOpts): Promise<NpmInstallReceipt> {
    const {pkgName, installType, hasAppiumDependency} = opts;
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
    if (!hasAppiumDependency) {
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

    const pkgJsonPath = await resolveFrom(cwd, `${pkgName}/package.json`);
    try {
      const pkgJson = await fs.readFile(pkgJsonPath, 'utf8');
      const pkg = JSON.parse(pkgJson) as PackageJson;
      return {installPath: path.dirname(pkgJsonPath), pkg};
    } catch (e) {
      throw new Error(
        'The package was not downloaded correctly; its package.json ' +
          'did not exist or was unreadable. We looked for it at ' +
          pkgJsonPath,
        {cause: e},
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

  /** Resolves the Node executable and npm CLI selected by the Windows shim on PATH. */
  private async _resolveWindowsNpmCommand(execOpts: TeenProcessExecOptions): Promise<WindowsNpmCommand> {
    // npm.cmd cannot be spawned directly, and a shell would reinterpret arguments.
    // Resolve its adjacent CLI so the npm selected on PATH still receives each argument intact.
    const env = {...(execOpts.env ?? process.env)};
    let npmShim: string;
    try {
      npmShim = await this._findWindowsExecutable('npm.cmd', execOpts.cwd?.toString() ?? process.cwd(), env);
    } catch (cause) {
      throw new Error('Cannot find npm.cmd on PATH. Install npm and ensure its directory is on PATH.', {cause});
    }
    npmShim = await fs.realpath(npmShim);
    // Custom process options (for example cancellation or logging) belong to each caller.
    const hasCustomProcessOptions = Object.keys(execOpts).some((key) => !['cwd', 'shell', 'env'].includes(key));
    if (hasCustomProcessOptions) {
      return await this._resolveWindowsNpmCommandFromShim(npmShim, {...execOpts, env});
    }
    // npmrc values can interpolate arbitrary environment variables, so even variables
    // unrelated to PATH or npm_config_* may change the selected global prefix.
    const key = JSON.stringify([npmShim, execOpts.cwd, Object.entries(env).sort(([a], [b]) => a.localeCompare(b))]);
    const pending = this._pendingWindowsNpmCli.get(key);
    if (pending) {
      return await pending;
    }
    // No await between lookup and insertion: concurrent callers share this promise
    // without a lock or repeating the prefix probe.
    const resolution = this._resolveWindowsNpmCommandFromShim(npmShim, {...execOpts, env});
    this._pendingWindowsNpmCli.set(key, resolution);
    try {
      return await resolution;
    } finally {
      // Share concurrent work only: later calls must observe npmrc edits,
      // new npm versions, and recovery after failures.
      this._pendingWindowsNpmCli.delete(key);
    }
  }

  /** Searches the child working directory and PATH without falling back to the parent environment. */
  private async _findWindowsExecutable(command: string, cwd: string, env: NodeJS.ProcessEnv): Promise<string> {
    // Node passes only the first lexicographically sorted key for case-insensitive
    // duplicates on Windows (for example PATH and Path).
    const pathKey = Object.keys(env)
      .sort()
      .find((key) => key.toUpperCase() === 'PATH');
    const searchPath = pathKey === undefined ? '' : (env[pathKey] ?? '');
    const directories = [
      cwd,
      ...searchPath.split(path.delimiter).map((entry) => path.resolve(cwd, entry.replace(/^"(.*)"$/, '$1'))),
    ];
    // Start all lookups together, but consume them in PATH order so a match does
    // not wait for slower entries after it. Capture failures immediately, including
    // those from lookups we will not await after finding a match.
    const lookups = [...new Set(directories)].map(async (directory) => {
      try {
        // Absolute candidates prevent which from adding process.cwd() or using
        // process.env.PATH when the supplied PATH is empty.
        const executable = await fs.which(path.resolve(directory, command), {
          pathExt: path.extname(command).toUpperCase(),
          nothrow: true,
        });
        return {executable};
      } catch (error) {
        return {error};
      }
    });
    for (const lookup of lookups) {
      const result = await lookup;
      if ('error' in result) {
        throw result.error;
      }
      if (result.executable) {
        return result.executable;
      }
    }
    throw new Error(`Cannot find ${command} in the supplied search path`);
  }

  /** Resolves the Node executable and npm CLI for a discovered shim, including its global prefix. */
  private async _resolveWindowsNpmCommandFromShim(
    npmShim: string,
    execOpts: TeenProcessExecOptions,
  ): Promise<WindowsNpmCommand> {
    const shimDir = path.dirname(npmShim);
    const adjacentNode = path.join(shimDir, 'node.exe');
    const node = (await fs.exists(adjacentNode))
      ? adjacentNode
      : await this._findWindowsExecutable(
          'node.exe',
          execOpts.cwd?.toString() ?? process.cwd(),
          execOpts.env ?? process.env,
        );
    // Project-local npm shims live in node_modules/.bin and target the sibling npm package.
    const isLocalShim =
      path.basename(shimDir).toLowerCase() === '.bin' &&
      path.basename(path.dirname(shimDir)).toLowerCase() === 'node_modules';
    const npmBin = isLocalShim
      ? path.join(shimDir, '..', 'npm', 'bin')
      : path.join(shimDir, 'node_modules', 'npm', 'bin');
    let npmCli = path.join(npmBin, 'npm-cli.js');
    // Official npm shims prefer a globally updated npm when one exists at the configured prefix.
    const prefixScript = path.join(npmBin, 'npm-prefix.js');
    if (!isLocalShim && (await fs.exists(prefixScript))) {
      const prefix = await this._getWindowsNpmPrefix(node, prefixScript, execOpts);
      const prefixCli = path.join(prefix, 'node_modules', 'npm', 'bin', 'npm-cli.js');
      if (prefix && (await fs.exists(prefixCli))) {
        npmCli = prefixCli;
      }
    }
    if (!(await fs.exists(npmCli))) {
      throw new Error(`Cannot find the npm CLI adjacent to '${npmShim}': '${npmCli}'`);
    }
    return {node, cli: npmCli};
  }

  /** Captures the shim's prefix probe independently of the final npm command's output settings. */
  private async _getWindowsNpmPrefix(
    node: string,
    prefixScript: string,
    execOpts: TeenProcessExecOptions,
  ): Promise<string> {
    try {
      const {stdout} = await exec(node, [prefixScript], {
        ...execOpts,
        stdio: 'pipe',
        ignoreOutput: false,
        isBuffer: false,
        encoding: 'utf8',
        logger: undefined,
        maxStdoutBufferSize: undefined,
        maxStderrBufferSize: undefined,
      });
      return stdout.trim();
    } catch (error) {
      const {code, stdout} = error as ExecError;
      // cmd's FOR /F consumes output even on an unsuccessful helper exit.
      // Without a selected prefix, the shim keeps its adjacent CLI.
      // Spawn errors, cancellation and timeouts are not normal helper exits.
      if (typeof code !== 'number' || code === 0 || execOpts.signal?.aborted) {
        throw error;
      }
      return stdout.trim();
    }
  }
}

/**
 * Resolves `moduleId` using Node's module resolution from `fromDirectory`.
 *
 * @param fromDirectory - Directory to resolve from (typically a project or `APPIUM_HOME` root)
 * @param moduleId - Module id or path to resolve (e.g. `semver/package.json`)
 * @returns Resolved module id. Package paths are typically absolute filesystem paths; built-in
 *   modules may resolve to non-absolute ids (e.g. `node:fs`, `fs`).
 * @throws `Error` if Node cannot resolve `moduleId` from `fromDirectory`
 */
export async function resolveFrom(fromDirectory: string, moduleId: string): Promise<string> {
  let resolvedFromDirectory: string;
  try {
    resolvedFromDirectory = await fs.realpath(fromDirectory);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      resolvedFromDirectory = path.resolve(fromDirectory);
    } else {
      throw error;
    }
  }

  const fromFile = path.join(resolvedFromDirectory, 'noop.js');
  const nodeModule = Module as typeof Module & {
    _resolveFilename: (id: string, parent: {id: string; filename: string; paths: string[]}) => string;
    _nodeModulePaths: (from: string) => string[];
  };
  return nodeModule._resolveFilename(moduleId, {
    id: fromFile,
    filename: fromFile,
    paths: nodeModule._nodeModulePaths(resolvedFromDirectory),
  });
}

export const npm = new NPM();
